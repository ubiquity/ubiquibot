// import { CreateChatCompletionRequestMessage, Configuration, OpenAIApi, ResponseTypes } from 'openai-edge'
import { getBotContext, getLogger } from "../../../bindings";
import { Payload, UserType } from "../../../types";
import { getAllIssueComments } from "../../../helpers";
import { BasePromptTemplate, PromptTemplate } from "langchain";

import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";

interface StreamlinedComment {
  login: string;
  body: string;
}

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
If you require additional information, ask the user to provide more details. \n
`;

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

  const regex = /^\/ask\s([\w-]+)\s(\d+)\s(\d+)\s"(.+)"$/;

  const matches = body.match(regex);
  const chatHistory: CreateChatCompletionRequestMessage[] = [];

  if (matches) {
    const [, repoName, actionNumber, commentID, body] = matches;
    initQContext = commentID;

    const comments = await getAllIssueComments(issue.number);

    const streamlined: StreamlinedComment[] = [];

    comments.forEach((comment) => {
      if (comment.user.type == UserType.User) {
        streamlined.push({
          login: comment.user.login,
          body: comment.body,
        });
      }
    });

    initQContext = streamlined;

    // Have they cited a commentID?
    const isItThisIssue = issue.number == Number(actionNumber);
    if (isItThisIssue) {
      // replace commentID with actual comment if it lives on this issue
      initQContext = streamlined;
    } else {
      // find the matching comment in whatever issue it is in
      try {
        const allComments = await getAllIssueComments(Number(actionNumber));
        const otherRepoStreamlined: StreamlinedComment[] = [];

        allComments.forEach((comment) => {
          if (comment.user.type == UserType.User) {
            otherRepoStreamlined.push({
              login: comment.user.login,
              body: comment.body,
            });
          }
        });

        initQContext = otherRepoStreamlined;
      } catch (err) {
        return `Could not find comment in ${repoName} with issue number: ${actionNumber}`;
      }
    }

    // has this sender asked any questions on this issue before?
    if (streamlined.length > 0) {
      // Push the original context and system message to the chat history
      chatHistory.push(
        {
          role: "system",
          content: sysMsg,
          name: "UbiquityAI",
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Question Context: " + initQContext,
          name: sender,
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: body,
          name: sender,
        } as CreateChatCompletionRequestMessage
      );

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
          role: "system",
          content: "Question Context: " + initQContext,
          name: sender,
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

    // chat history as a string, length
    console.log("=====================================");
    console.log("chat history length as a string: ", JSON.stringify(chatHistory).length);
    console.log("=====================================");
    console.log("chat history length: ", chatHistory.length);
    console.log("=====================================");
    console.log("chat history: ", chatHistory);
    console.log("=====================================");
    console.log("chat history: ", JSON.stringify(chatHistory));
    console.log("=====================================");
    const gptResponse = await askGPT(body, chatHistory);
    if (!gptResponse) {
      return `Error getting response from GPT`;
    }

    return gptResponse;
  } else {
    return "Invalid syntax for ask \n usage: '/ask (repo name) (pull/issue) (action number) (comment ID) (question)' \n  ex-1 /ask ubiquibot 663 1690784310 What is pi?";
  }
};
