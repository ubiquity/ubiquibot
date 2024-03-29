import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { getAllIssueComments } from "../../../helpers/issue";
import { Context } from "../../../types/context";
import { StreamlinedComment } from "../../../types/openai";
import { GitHubPayload, UserType } from "../../../types/payload";
import { askGPT, decideContextGPT, getAllLinkedIssuesAndPullsInBody, sysMsg } from "./ask/ask-gpt";

export async function ask(context: Context, body: string) {
  // The question to ask
  const logger = context.logger;

  const payload = context.event.payload as GitHubPayload;
  const sender = payload.sender.login;
  const issue = payload.issue;

  if (!body) {
    return `Please ask a question`;
  }

  if (!issue) {
    return `This command can only be used on issues and pull requests`;
  }

  const chatHistory: CreateChatCompletionRequestMessage[] = [];
  const streamlined: StreamlinedComment[] = [];
  let linkedPRStreamlined: StreamlinedComment[] = [];
  let linkedIssueStreamlined: StreamlinedComment[] = [];

  const regex = /^\/ask\s(.+)$/;
  const matches = body.match(regex);

  if (matches) {
    const [, body] = matches;

    // standard comments
    const comments = await getAllIssueComments(context, issue.number);
    // raw so we can grab the <!--- { 'UbiquiBot': 'answer' } ---> tag
    const commentsRaw = await getAllIssueComments(context, issue.number, "raw");

    if (!comments) {
      throw logger.fatal(`Error getting issue comments`);
    }

    // add the first comment of the issue/pull request
    streamlined.push({
      login: issue.user.login,
      body: issue.body,
    });

    // add the rest
    comments.forEach(async (comment, i) => {
      if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'UbiquiBot': 'answer' } --->")) {
        streamlined.push({
          login: comment.user.login,
          body: comment.body,
        });
      }
    });

    // returns the conversational context from all linked issues and prs
    const links = await getAllLinkedIssuesAndPullsInBody(context, issue.number);

    if (typeof links === "string") {
      logger.info("Error getting linked issues or prs: ", links);
    } else {
      linkedIssueStreamlined = links.linkedIssues;
      linkedPRStreamlined = links.linkedPrs;
    }

    // let chatgpt deduce what is the most relevant context
    const gptDecidedContext = await decideContextGPT(
      context,
      chatHistory,
      streamlined,
      linkedPRStreamlined,
      linkedIssueStreamlined
    );

    if (linkedIssueStreamlined.length == 0 && linkedPRStreamlined.length == 0) {
      // No external context to add
      chatHistory.push(
        {
          role: "system",
          content: sysMsg,
          name: "UbiquiBot",
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
          name: "UbiquiBot",
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Original Context: " + JSON.stringify(gptDecidedContext),
          name: "system",
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: "Question: " + JSON.stringify(body),
          name: "user",
        } as CreateChatCompletionRequestMessage
      );
    }

    const gptResponse = await askGPT(context, chatHistory);

    if (typeof gptResponse === "string") {
      return gptResponse;
    } else if (gptResponse.answer) {
      return gptResponse.answer;
    } else {
      throw logger.fatal("Error getting response from OpenAI");
    }
  } else {
    return logger.error("Invalid syntax for ask. usage: '/ask What is pi?'");
  }
}
