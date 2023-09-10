import { getBotContext, getLogger } from "../../../bindings";
import { GPTResponse, Payload, StreamlinedComment, UserType } from "../../../types";
import { getAllIssueComments, getAllLinkedIssuesAndPullsInBody, getPullByNumber } from "../../../helpers";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { askGPT, decideContextGPT, gptContextTemplate, specCheckTemplate, speckCheckResponse } from "../../../helpers/gpt";
import { ErrorDiff } from "../../../utils/helpers";

/**
 * @notice Three calls to OpenAI are made. First for context, second for review and third for finalization.
 * @returns Pull Request Report
 */
export const review = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();

  const payload = context.payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    return ErrorDiff(`Payload issue is undefined.`);
  }

  if (!body) {
    return ErrorDiff(`Payload body is undefined.`);
  }

  const isPr = await getPullByNumber(context, issue.number);

  if (!isPr) {
    return ErrorDiff(`Can only be used on pull requests.`);
  }

  const reviewRegex = /^\/review/;
  const reviewRegexMatch = body.match(reviewRegex);

  if (!reviewRegexMatch) {
    return ErrorDiff(`Error matching regex for review`);
  }

  const streamlined: StreamlinedComment[] = [];
  let chatHistory: CreateChatCompletionRequestMessage[] = [];
  let linkedPRStreamlined: StreamlinedComment[] = [];
  let linkedIssueStreamlined: StreamlinedComment[] = [];

  const comments = await getAllIssueComments(issue.number);
  const commentsRaw = await getAllIssueComments(issue.number, "raw");

  if (!commentsRaw) {
    logger.info(`Error getting issue comments`);
    return ErrorDiff(`Error getting issue comments.`);
  }
  streamlined.push({
    login: issue.user.login,
    body: issue.body,
  });

  comments.forEach(async (comment, i) => {
    if (comment.user.type == UserType.User || commentsRaw[i].body.includes("<!--- { 'OpenAI': 'answer' } --->")) {
      streamlined.push({
        login: comment.user.login,
        body: comment.body,
      });
    }
  });

  // returns the conversational context from all linked issues and prs
  const links = await getAllLinkedIssuesAndPullsInBody(issue.number);

  if (typeof links === "string") {
    logger.info(`Error getting linked issues or prs: ${links}`);
    return ErrorDiff(`Error getting linked issues or prs: ${links}`);
  }
  linkedIssueStreamlined = links.linkedIssues;
  linkedPRStreamlined = links.linkedPrs;

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

  const isPull = async () => {
    if (isPr) {
      const diff = await comparePR()
        .then(({ diff }) => {
          return diff;
        })
        .catch((error) => {
          logger.info(`Error getting diff: ${error}`);
          return ErrorDiff(`Error getting diff: ${error}`);
        });

      chatHistory.push({
        role: "system",
        content: gptContextTemplate,
      } as CreateChatCompletionRequestMessage);

      // We're allowing OpenAI to deduce what is the most relevant context
      const gptDecidedContext = await decideContextGPT(chatHistory, streamlined, linkedPRStreamlined, linkedIssueStreamlined);

      if (typeof gptDecidedContext === "string") {
        return gptDecidedContext;
      }

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: specCheckTemplate, // provide the spec check template
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Context: \n" + JSON.stringify(gptDecidedContext.answer), // provide the context
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: "PR Diff: \n" + JSON.stringify(diff), // provide the diff
        } as CreateChatCompletionRequestMessage
      );

      const draftReport: GPTResponse | string = await askGPT(`first pr review call for #${issue.number}`, chatHistory);
      let draftReportAnswer = "";

      if (typeof draftReport === "string") {
        return draftReport;
      } else {
        if (draftReport.answer) {
          draftReportAnswer = draftReport.answer;
          return draftReportAnswer;
        }
      }

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: speckCheckResponse, // provide the finalization template
        } as CreateChatCompletionRequestMessage,
        {
          role: "system",
          content: "Spec Review: \n" + draftReportAnswer, // provide the first analysis
        } as CreateChatCompletionRequestMessage,
        {
          role: "assistant",
          content: "Supporting data: \n" + JSON.stringify(gptDecidedContext), // provide the context
        } as CreateChatCompletionRequestMessage
      );

      const gptResponse: GPTResponse | string = await askGPT(`final pr review call for #${issue.number}`, chatHistory);

      if (typeof gptResponse === "string") {
        return gptResponse;
      } else {
        if (gptResponse.answer) {
          return gptResponse.answer;
        } else {
          return ErrorDiff(`No answer found for issue #${issue.number}`);
        }
      }
    } else {
      return ErrorDiff(`No PR found for issue #${issue.number}`);
    }
  };

  const res = await isPull();
  return res;
};
