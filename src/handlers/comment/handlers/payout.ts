import { getLogger } from "../../../bindings";
import { BotContext, Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";
import {
  calculateIssueAssigneeReward,
  calculateIssueConversationReward,
  calculateIssueCreatorReward,
  calculatePullRequestReviewsReward,
  handleIssueClosed,
  incentivesCalculation,
} from "../../payout";
import { getAllIssueComments, getUserPermission } from "../../../helpers";
import { GLOBAL_STRINGS } from "../../../configs";

export const payout = async (context: BotContext, body: string) => {
  const { payload: _payload } = context;
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

  const IssueComments = await getAllIssueComments(context, issue.number);
  if (IssueComments.length === 0) {
    return `Permit generation failed due to internal GitHub Error`;
  }

  const hasPosted = IssueComments.find((e) => e.user.type === "Bot" && e.body.includes("https://pay.ubq.fi?claim"));
  if (hasPosted) {
    logger.info(`Permit already generated for ${payload.issue?.number}`);
    return;
  }

  // assign function incentivesCalculation to a variable
  const calculateIncentives = await incentivesCalculation(context);

  const creatorReward = await calculateIssueCreatorReward(context, calculateIncentives);
  const assigneeReward = await calculateIssueAssigneeReward(calculateIncentives);
  const conversationRewards = await calculateIssueConversationReward(context, calculateIncentives);
  const pullRequestReviewersReward = await calculatePullRequestReviewsReward(context, calculateIncentives);

  return await handleIssueClosed(context, creatorReward, assigneeReward, conversationRewards, pullRequestReviewersReward, calculateIncentives);
};

export const autoPay = async (context: BotContext, body: string) => {
  const _payload = context.payload;
  const logger = getLogger();

  const payload = _payload as Payload;
  logger.info(`Received '/autopay' command from user: ${payload.sender.login}`);

  const pattern = /^\/autopay (true|false)$/;
  const res = body.match(pattern);

  if (res) {
    const userPermission = await getUserPermission(context, payload.sender.login);
    if (userPermission !== "admin" && userPermission !== "billing_manager") {
      return "You must be an `admin` or `billing_manager` to toggle automatic payments for completed issues.";
    }
    if (res.length > 1) {
      return `${GLOBAL_STRINGS.autopayComment} **${res[1]}**`;
    }
  }
  return "Invalid body for autopay command: e.g. /autopay false";
};
