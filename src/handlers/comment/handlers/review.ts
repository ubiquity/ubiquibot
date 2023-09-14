import { getBotContext, getLogger } from "../../../bindings";
import { Payload, StreamlinedComment } from "../../../types";
import { getAllIssueComments, getPullByNumber } from "../../../helpers";
import { CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { askGPT, getPRSpec, specCheckTemplate } from "../../../helpers/gpt";
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
  const commentsRaw = await getAllIssueComments(issue.number, "raw");

  if (!commentsRaw) {
    logger.info(`Error getting issue comments`);
    return ErrorDiff(`Error getting issue comments.`);
  }

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

      const spec = await getPRSpec(context, chatHistory, streamlined);

      chatHistory = [];
      chatHistory.push(
        {
          role: "system",
          content: specCheckTemplate,
        } as CreateChatCompletionRequestMessage,
        {
          role: "assistant",
          content: "Spec for Pr: \n" + JSON.stringify(spec),
        } as CreateChatCompletionRequestMessage,
        {
          role: "user",
          content: `${issue.assignees[0].login}'s PR Diff: \n` + JSON.stringify(diff),
        } as CreateChatCompletionRequestMessage
      );

      const gptResponse = await askGPT(`Pr review call for #${issue.number}`, chatHistory);

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
  if (res.startsWith("```diff\n")) {
    return res;
  }
  return res + `\n> <small> Ensure the pull request requirements are in the linked issue's first comment and update it if the scope evolves. </small>.`;
};
