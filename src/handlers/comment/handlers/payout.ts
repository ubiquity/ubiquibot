import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { handleIssueClosed } from "../../payout";
import { getAllIssueComments } from "../../../helpers";

export const payout = async (body: string) => {
  const { payload: _payload } = getBotContext();
  const logger = getLogger();
  if (body != IssueCommentCommands.PAYOUT && body.replace(/`/g, "") != IssueCommentCommands.PAYOUT) {
    logger.info(`Skipping to payout. body: ${body}`);
    return;
  }

  const payload = _payload as Payload;
  logger.info(`Received '/payout' command from user: ${payload.sender.login}`);
  const issue = (_payload as Payload).issue;
  if (!issue) {
    logger.info(`Skipping '/payout' because of no issue instance`);
    return;
  }

  const _labels = payload.issue?.labels;
  if (_labels?.some((e) => e.name.toLowerCase() === "Permitted".toLowerCase())) {
    logger.info(`Permit already generated for ${payload.issue?.number}`);
    return;
  }

  const IssueComments = await getAllIssueComments(issue.number);
  if (IssueComments === null) {
    return `Permit generation failed due to internal GitHub Error`;
  }

  const hasPosted = IssueComments.find((e) => e.user.type === "Bot" && e.body.includes("https://pay.ubq.fi?claim"));
  if (hasPosted) {
    logger.info(`Permit already generated for ${payload.issue?.number}`);
    return;
  }

  let response = await handleIssueClosed();
  return response;
};
