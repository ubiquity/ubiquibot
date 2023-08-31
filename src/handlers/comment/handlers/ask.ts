import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { Payload, UserType } from "../../../types";
import { addCommentToIssue, getAllIssueComments, getIssueByNumber, getPullByNumber } from "../../../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { link } from "fs";

interface StreamlinedComment {
  login: string | null | undefined;
  body: string | null | undefined;
}

interface GPTResponse {
  answer: string | null;
  tokenUsage: {
    output: number | undefined;
    input: number | undefined;
    total: number | undefined;
  };
}

const sysMsg = `You are the UbiquityAI, designed to provide accurate technical answers. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Do not make up answers. If you are unsure, say so. \n
Original Context exists only to provide you with additional information to the current question, use it to formulate answers. \n
Infer the context of the question from the Original Context using your best judgement. \n
All replies MUST begin "<!--- { 'UbiquityAI': 'answer' } ---> \n\n" followed by your response. \n
`;

const speckCheck = `You are the UbiquityAI, designed to analyze pull request changes in comparison to issue spec. \n
Understanding the specification is critical to your success, use the context and diff provided. \n
You will determine based on the spec whether or not the implementation is sound. \n
First will the logic work? Second how close to meeting the spec is it? \n
Provide a score from 0 to 100, 0 being not at all and 100 being perfect. \n
Provide an analysis of the implementation in comparison to the spec. \n
All replies MUST begin "<!--- { 'UbiquityAI': 'answer' } ---> \n\n" followed by your response. \n
`;

export const askGPT = async (question: string, chatHistory: CreateChatCompletionRequestMessage[]) => {
  const logger = getLogger();
  const config = getBotConfig();

  const openAI = new OpenAI({
    apiKey: config.ask.apiKey,
  });

  const res: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo",
  });

  const answer = res.choices[0].message.content;

  const tokenUsage = {
    output: res.usage?.completion_tokens,
    input: res.usage?.prompt_tokens,
    total: res.usage?.total_tokens,
  };

  if (!res) {
    logger.info(`No answer found for question: ${question}`);
  }

  return { answer, tokenUsage };
};

/**
 * @param body The question to ask
 */
export const ask = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const issue = payload.issue;

  let initQContext: string | null | undefined;

  if (!body) {
    return `Please ask a question`;
  }

  if (!issue) {
    return `This command can only be used on issues`;
  }

  const regex = /^\/ask\s(.+)$/;

  const matches = body.match(regex);
  let chatHistory: CreateChatCompletionRequestMessage[] = [];
  const streamlined: StreamlinedComment[] = [];
  const linkedCommentsStreamlined: StreamlinedComment[] = [];
  const prStreamlined: StreamlinedComment[] = [];

  // return a diff of the changes made in the PR
  const comparePR = async () => {
    const comparePR = await context.octokit.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: issue.number,
    });

    const pr = comparePR.data;

    const prDiff = await context.octokit.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pr.number,
      mediaType: {
        format: "diff",
      },
    });

    const diffContent = prDiff.data;

    return {
      pr,
      diff: diffContent,
    };
  };

  // check if this issue is a pr
  const isPr = await getPullByNumber(context, issue.number);

  if (matches) {
    const [, body] = matches;

    // standard comments
    const comments = await getAllIssueComments(issue.number);
    // raw so we can grab the <!--- { 'UbiquityAI': 'answer' } ---> tag
    const commentsRaw = await getAllIssueComments(issue.number, "raw");

    if (!comments) {
      logger.info(`Error getting issue comments`);
    }

    // add the first comment of the issue
    streamlined.push({
      login: issue.user.login,
      body: issue.body,
    });

    // add the rest
    comments.forEach(async (comment, i) => {
      if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'answer' } --->")) {
        streamlined.push({
          login: comment.user.login,
          body: comment.body,
        });
      }
    });

    try {
      // the very first comment of the issue should be the issue spec
      const connected = issue.body;
      // as per issue formatting, we grab the context using the "#<issue number>" tag
      const referencedIssue = await getAllIssueComments(Number(connected.split("#")[1].split("\n")[0]));
      // chop off the "#<issue number>" tag
      const referencedIssueBody = await getIssueByNumber(context, Number(connected.split("#")[1].split("\n")[0]));
      // this way we can determine if there is referenced issue context or if it's a standalone issue
      initQContext = referencedIssueBody?.body;

      if (!referencedIssue) {
        logger.info(`Error getting referenced issue comments`);
      }

      // add the first comment of the referenced issue
      linkedCommentsStreamlined.push({
        login: referencedIssueBody?.user?.login,
        body: referencedIssueBody?.body,
      });

      // add the rest of the comments of the referenced issue
      referencedIssue.forEach((comment, i) => {
        if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'answer' } --->")) {
          linkedCommentsStreamlined.push({
            login: comment.user.login,
            body: comment.body,
          });
        }
      });
    } catch (error) {
      logger.info(`Error getting referenced issue comments: ${error}`);
    }

    let isStreaming = false;

    // if this is a pr, we'll grab the spec and diff and pass it to the AI
    const isPull = async () => {
      if (isPr) {
        const diff = await comparePR()
          .then(({ pr, diff }) => {
            console.log("=============== DIFF ==================");
            console.log(diff);
            console.log("=============== DIFF ==================");
            return diff;
          })
          .catch((error) => console.log(error));

        // Pass the spec and the diff to the AI before we make the main call
        chatHistory.push(
          {
            role: "system",
            content: speckCheck,
            name: "UbiquityAI",
          } as CreateChatCompletionRequestMessage,
          {
            role: "user",
            content: "Spec: " + JSON.stringify(linkedCommentsStreamlined), // Spec should be the linked issue chat history
            name: "user",
          } as CreateChatCompletionRequestMessage,
          {
            role: "user",
            content: "PR Diff: " + JSON.stringify(diff), // provide the diff
            name: "user",
          } as CreateChatCompletionRequestMessage
        );

        isStreaming = true; // incase the answer is still being generated we can wait for it

        const gptResponse: GPTResponse | string = await askGPT(body, chatHistory);

        if (!gptResponse) {
          logger.info(`Error getting response from GPT`);
        }

        if (typeof gptResponse === "string") {
          return gptResponse;
        } else {
          if (gptResponse.answer) {
            await addCommentToIssue(gptResponse.answer, issue.number); // add the diff analysis to the issue
            isStreaming = false;
            return gptResponse.answer;
          }
        }
      }
    };

    await isPull();

    chatHistory = []; // clear the chat history so the next call is a fresh interaction

    if (initQContext?.length == 0) {
      chatHistory.push(
        {
          role: "system",
          content: sysMsg,
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: body,
          name: sender,
        } as CreateChatCompletionRequestMessage
      );
    } else {
      chatHistory.push(
        {
          role: "system",
          content: sysMsg,
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Original Context: " + JSON.stringify(linkedCommentsStreamlined),
          name: "system",
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: "Question: " + JSON.stringify(streamlined),
          name: "user",
        } as CreateChatCompletionRequestMessage
      );
    }

    if (!isStreaming) {
      const gptResponse: GPTResponse | string = await askGPT(body, chatHistory);
      console.log("====================================");
      console.log(chatHistory);
      console.log("====================================");
      console.log(gptResponse);
      console.log("====================================");

      if (!gptResponse) {
        return `Error getting response from GPT`;
      }

      if (typeof gptResponse === "string") {
        return gptResponse;
      } else {
        return gptResponse.answer;
      }
    } else {
      await setInterval(async () => {
        if (!isStreaming) {
          const gptResponse: GPTResponse | string = await askGPT(body, chatHistory);
          console.log("====================================");
          console.log(chatHistory);
          console.log("====================================");
          console.log(gptResponse);
          console.log("====================================");

          if (!gptResponse) {
            return `Error getting response from GPT`;
          }

          if (typeof gptResponse === "string") {
            return gptResponse;
          } else {
            return gptResponse.answer;
          }
        }
      }, 1000);
    }
  } else {
    return "Invalid syntax for ask \n usage: '/ask What is pi?";
  }
};
