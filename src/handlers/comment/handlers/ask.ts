// import { CreateChatCompletionRequestMessage, Configuration, OpenAIApi, ResponseTypes } from 'openai-edge'
import { getBotContext, getLogger } from "../../../bindings";
import { Payload, UserType } from "../../../types";
import { getAllIssueComments } from "../../../helpers";
import { BasePromptTemplate, PromptTemplate } from "langchain";

import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sysMsg = `You are the UbiquityAI, designed to provide accurate technical answers. \n
Whenever appropriate, format your response using GitHub Flavored Markdown. Utilize tables, lists, and code blocks for clear and organized answers. \n
Craft your response for clarity. Use concise language while providing the necessary technical details. \n
Whenever possible, include relevant examples to clarify your explanations and make them easier for users to understand. \n
Feel free to refer to relevant documentation or resources to provide the most accurate and up-to-date information. \n
When referring to external resources, ensure proper attribution by providing links and acknowledging the original authors. \n
If you're unsure about an answer, it's better to admit it than to provide incorrect information. State that you don't have the required information. \n
For questions that require additional information, ask the user to provide more details. \n
When answering a follow-up question, refer to the original question to provide context and add an index. \n


ALWAYS REPLY IN THE FOLLOWING FORMAT: "{User: {User}} \n {Answer #(index): {Answer}}"\n\n
`;

async function replaceCommentIDWithBody(commentID: number, comments: any[]): Promise<string | undefined> {
  const matchingComment = comments.find((comment) => comment.id === commentID);
  return matchingComment ? matchingComment.body : undefined;
}

export const askGPT = async (question: string, chatHistory: CreateChatCompletionRequestMessage[]) => {
  const logger = getLogger();
  logger.info(`Received '/ask' command for question: ${question}`);

  const res: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create({
    messages: chatHistory,
    model: "gpt-3.5-turbo",
  });

  const answer = res.choices[0].message;

  if (!res) {
    logger.info(`No answer found for question: ${question}`);
    return "No answer found";
  }

  return answer.content;
};

/**
 * @param repoName To traverse repos incase original comment is not in call context repo
 * @param actionNumber To traverse issues incase original comment is not in call context issue
 * @param commentID To locate the original comment
 * @param body The question to ask
 */
export const ask = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const issue = payload.issue;
  let initQContext;

  if (!body) {
    return `Please ask a question`;
  }

  if (!issue) {
    return `This command can only be used on issues`;
  }

  const regex = /^\/ask\s([\w-]+)\s(issue|pull)\s(\d+)\s(\d+)\s"(.+)"$/;

  const matches = body.match(regex);
  const chatHistory: CreateChatCompletionRequestMessage[] = [];

  if (matches) {
    const [, repoName, action, actionNumber, commentID, body] = matches;
    initQContext = commentID;

    const comments = await getAllIssueComments(issue.number);
    const commentsWithAsk = comments.filter((content) => content.body.startsWith(`/ask`) && content.user.type == UserType.User);
    const commentsWithAnswer = comments.filter((content) => content.body.includes(`Answer #`) && content.user.type == UserType.Bot);
    const accsThatHaveAsked: string[] = [];

    let senderAskedQuestions = [];
    const senderAnsweredQuestions: string[] = [];

    commentsWithAsk.forEach((comment) => {
      accsThatHaveAsked.push(comment.user.login);
    });

    commentsWithAnswer.forEach((comment) => {
      accsThatHaveAsked.push(comment.user.login);
    });

    // Have they cited a commentID?
    if (initQContext != "0") {
      // Does the commentID live on a pull or an issue
      if (action == "issue") {
        const isItThisIssue = issue.number == Number(actionNumber);
        if (isItThisIssue) {
          // replace commentID with actual comment
          initQContext = await replaceCommentIDWithBody(Number(commentID), comments);
        } else {
          // find the matching comment in whatever issue it is in

          const allComments = await getAllIssueComments(Number(actionNumber));
          const matchingComment = await replaceCommentIDWithBody(Number(commentID), allComments);

          if (matchingComment) {
            initQContext = matchingComment;
          } else {
            return `Could not find comment in ${repoName} with issue number: ${actionNumber}`;
          }
        }
      } else if (action == "pull") {
        const isItThisPull = context.pullRequest().pull_number == Number(actionNumber);
        if (isItThisPull) {
          initQContext = await replaceCommentIDWithBody(Number(commentID), comments);
        } else {
          // find the matching comment in whatever pull it is in
          const allComments = await context.octokit.issues.listComments({
            owner: context.repo().owner,
            repo: repoName,
            issue_number: Number(actionNumber),
          });

          const matchingComment = await replaceCommentIDWithBody(Number(commentID), allComments.data);
          if (matchingComment) {
            initQContext = matchingComment;
          } else {
            return `Could not find comment in ${repoName} with pull number: ${actionNumber}`;
          }
        }
      }
    }

    senderAskedQuestions = comments.filter((content) => content.user.login == sender && content.body.startsWith(`/ask`));
    // has this sender asked any questions on this issue before?
    if (senderAskedQuestions.length > 0) {
      senderAskedQuestions.forEach((question, i) => {
        const answer = comments.find(
          (content) => content.user.login == "ubiquibot" && content.body.includes(`Answer #${i}`) && content.body.includes(`${sender}`)
        );
        if (answer) {
          senderAnsweredQuestions.push(answer.body);
        }
      });

      chatHistory.push(
        {
          role: "system",
          content: "Original Question: " + initQContext,
          name: sender,
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: sysMsg,
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage
      );

      // add their new question to the chat history
      for (let i = 0; i < senderAskedQuestions.length; i++) {
        const answeredYet = !senderAnsweredQuestions;

        if (answeredYet) {
          chatHistory.push(
            {
              role: "user",
              content: !senderAskedQuestions[i].body ? initQContext : senderAskedQuestions[i].body,
              name: sender,
            } as CreateChatCompletionRequestMessage,
            {
              role: "assistant",
              content: !senderAnsweredQuestions[i] ? "No answer found" : senderAnsweredQuestions[i],
              name: "UbiquityAI",
            } as CreateChatCompletionRequestMessage
          );
        }
      }

      chatHistory.push({
        role: "user",
        content: body,
        name: sender,
      } as CreateChatCompletionRequestMessage);

      logger.info(`Received '/ask' command from user: ${sender}`);
    } else {
      chatHistory.push(
        {
          role: "system",
          content: sysMsg,
          name: "system",
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: body,
          name: sender,
        } as CreateChatCompletionRequestMessage
      );

      logger.error("Invalid body for ask command");
      return "Invalid syntax for ask \n usage: '/ask (repo name) (pull/issue) (action number) (comment ID) (question)' \n  ex-1 /ask ubiquibot 663 1690784310 What is pi?";
    }

    const gptResponse = await askGPT(body, chatHistory);
    if (!gptResponse) {
      return `Error getting response from GPT`;
    }

    return gptResponse;
  }
};
