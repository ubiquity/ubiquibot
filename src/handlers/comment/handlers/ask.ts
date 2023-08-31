// import { CreateChatCompletionRequestMessage, Configuration, OpenAIApi, ResponseTypes } from 'openai-edge'
import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { Payload, UserType } from "../../../types";
import { getAllIssueComments, getIssueByNumber } from "../../../helpers";
import OpenAI from "openai";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";

interface StreamlinedComment {
  login: string;
  body: string;
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

  const answer = res.choices[0].message;

  if (!res) {
    logger.info(`No answer found for question: ${question}`);
    return "No answer found";
  }

  return answer.content;
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
  let initQContext;

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
      return `Error getting issue comments`;
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

    initQContext = streamlined;
    let connected: string;

    try {
      connected = issue.body;

      if (connected != "") {
        const referencedIssue = await getAllIssueComments(Number(connected.split("#")[1].split("\n")[0]));
        const referencedIssueBody = await getIssueByNumber(context, Number(connected.split("#")[1].split("\n")[0]));

        linkedCommentsStreamlined.push({
          login: referencedIssueBody?.user.login,
          body: referencedIssueBody?.body,
        });

        if (referencedIssue) {
          referencedIssue.forEach((comment) => {
            if (comment.user.type == UserType.User || comment.body.includes("Answered:") == true) {
              linkedCommentsStreamlined.push({
                login: comment.user.login,
                body: comment.body,
              });
            }
          });
        }
      }
    } catch (error) {
      logger.info(`No connected issue found for question: ${body}`);
    }

    if (initQContext.length == 0) {
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

    console.log("==========================================");
    console.log("chatHistory: ", chatHistory);
    logger.info(`Received '/ask' command from user: ${sender}`);
    logger.info(`TODO: Add token count...`);
    logger.info(`Question: ${body}`);
    const gptResponse = await askGPT(body, chatHistory);
    if (!gptResponse) {
      return `Error getting response from GPT`;
    }

    return gptResponse;
  } else {
    return "Invalid syntax for ask \n usage: '/ask (repo name) (pull/issue) (action number) (comment ID) (question)' \n  ex-1 /ask ubiquibot 663 1690784310 What is pi?";
  }
};
