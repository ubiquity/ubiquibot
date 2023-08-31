import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { Payload, UserType } from "../../../types";
import { getAllIssueComments, getIssueByNumber } from "../../../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";

interface StreamlinedComment {
  login: string;
  body: string;
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
All replies MUST begin "Answered: " followed by your response. \n
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
  const chatHistory: CreateChatCompletionRequestMessage[] = [];

  if (matches) {
    const [, body] = matches;

    const comments = await getAllIssueComments(issue.number);
    if (!comments) {
      logger.info(`Error getting issue comments`);
    }

    const streamlined: StreamlinedComment[] = [];
    const linkedCommentsStreamlined: StreamlinedComment[] = [];

    comments.forEach((comment) => {
      if (comment.user.type == UserType.User || comment.body.includes("Answered:") == true) {
        streamlined.push({
          login: comment.user.login,
          body: comment.body,
        });
      }
    });

    try {
      const connected = issue.body;
      const referencedIssue = await getAllIssueComments(Number(connected.split("#")[1].split("\n")[0]));
      const referencedIssueBody = await getIssueByNumber(context, Number(connected.split("#")[1].split("\n")[0]));
      initQContext = referencedIssueBody?.body;

      if (!referencedIssue) {
        logger.info(`Error getting referenced issue comments`);
      }

      referencedIssue.forEach((comment) => {
        if (comment.user.type == UserType.User || comment.body.includes("Answered:") == true) {
          linkedCommentsStreamlined.push({
            login: comment.user.login,
            body: comment.body,
          });
        }
      });
    } catch (error) {
      logger.info(`Error getting referenced issue comments: ${error}`);
    }

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
          content: "Question: " + JSON.stringify(initQContext),
          name: "user",
        } as CreateChatCompletionRequestMessage
      );
    }

    const gptResponse: GPTResponse | string = await askGPT(body, chatHistory);

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
    return "Invalid syntax for ask \n usage: '/ask What is pi?";
  }
};
