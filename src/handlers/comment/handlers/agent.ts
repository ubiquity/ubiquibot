import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { getAllIssueComments, getAllLinkedIssuesAndPullsInBody } from "../../../helpers";
import { decideContextGPT } from "../../../helpers/gpt";
import { Payload, StreamlinedComment, UserType } from "../../../types";
import { ErrorDiff } from "../../../utils/helpers";
import { ubqGitHubAgent } from "../../../agents/types/agent";
import { agentSystemMsg } from "../../../agents/utils/prompts";

export const agent = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const issue = payload.issue;

  if (!body) {
    return `Please ask a question`;
  }

  if (!issue) {
    return `This command can only be used on issues`;
  }

  const chatHistory: CreateChatCompletionRequestMessage[] = [];
  const streamlined: StreamlinedComment[] = [];
  let linkedPRStreamlined: StreamlinedComment[] = [];
  let linkedIssueStreamlined: StreamlinedComment[] = [];

  const regex = /^\/agent\s(.+)$/;
  const matches = body.match(regex);

  if (matches) {
    const [, body] = matches;

    const comments = await getAllIssueComments(issue.number);
    const commentsRaw = await getAllIssueComments(issue.number, "raw");

    const askingForUserInputResponses = [];

    if (!comments) {
      logger.info(`Error getting issue comments`);
      return ErrorDiff(`Error getting issue comments`);
    }

    streamlined.push({
      login: issue.user.login,
      body: issue.body,
    });

    comments.forEach(async (comment, i) => {
      if (commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'askingForUserInput' } --->")) {
        const regex = /<!--- { 'UbiquityAI': 'askingForUserInput' } --->\n\n(.+)/;
        const matches = commentsRaw[i].body.match(regex);
        const userResponse = commentsRaw[i - 1];

        if (matches) {
          const [, question] = matches;
          askingForUserInputResponses.push({
            question: question,
            response: userResponse,
          });
        }
      }

      if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquityAI': 'answer' } --->")) {
        streamlined.push({
          login: comment.user.login,
          body: comment.body,
        });
      }
    });

    const links = await getAllLinkedIssuesAndPullsInBody(issue.number);

    if (typeof links === "string") {
      logger.info(`Error getting linked issues or prs: ${links}`);
    } else {
      linkedIssueStreamlined = links.linkedIssues;
      linkedPRStreamlined = links.linkedPrs;
    }

    const gptDecidedContext = await decideContextGPT(chatHistory, streamlined, linkedPRStreamlined, linkedIssueStreamlined);

    if (linkedIssueStreamlined.length == 0 && linkedPRStreamlined.length == 0) {
      chatHistory.push(
        {
          role: "system",
          content: agentSystemMsg,
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: `${sender}:\n ${body}`,
        } as CreateChatCompletionRequestMessage
      );
    } else {
      chatHistory.push(
        {
          role: "system",
          content: agentSystemMsg,
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Original Context: " + JSON.stringify(gptDecidedContext),
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: `Question from ${sender}: ` + JSON.stringify(body),
        } as CreateChatCompletionRequestMessage
      );
    }

    const response = await askAgent(body, chatHistory);

    return response;
  } else {
    return ErrorDiff(`Agent command not found.`);
  }
};

export const askAgent = async (question: string, chatHistory: CreateChatCompletionRequestMessage[]) => {
  const logger = getLogger();
  const config = getBotConfig();

  const res = await ubqGitHubAgent(question, chatHistory);

  logger.info(`Agent response: ${JSON.stringify(res)}`);

  console.log("====================================");
  console.log("config:", config);
  console.log("====================================");

  if (typeof res === "string") {
    return res;
  } else if (res == null) {
    return ErrorDiff(`Agent response is null`);
  } else {
    return ErrorDiff(`Agent response is undefined`);
  }
};
