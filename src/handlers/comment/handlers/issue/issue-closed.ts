import Runtime from "../../../../bindings/bot-runtime";
import { Payload, Context } from "../../../../types";
import { calculateIssueAssigneeReward } from "../../../payout/calculate-issue-assignee-reward";
import { calculateIssueConversationReward } from "../../../payout/calculate-issue-conversation-reward";
import { calculateIssueCreatorReward } from "../../../payout/calculate-issue-creator-reward";
import { calculateReviewContributorRewards } from "../../../payout/calculate-review-contributor-rewards";
import { handleIssueClosed } from "../../../payout/handle-issue-closed";
import { incentivesCalculation } from "../../../payout/incentives-calculation";

export async function issueClosed(context: Context) {
  const { organization, logger, owner } = getEssentials(context);

  if (!organization) {
    logger.warn("No organization found in payload, falling back to `owner`");
    if (!owner) {
      throw logger.error("Cannot save permit to DB, missing organization and owner");
    }
  }

  // assign function incentivesCalculation to a variable
  const calculateIncentives = await incentivesCalculation(context);
  const creatorReward = await calculateIssueCreatorReward(context, calculateIncentives);
  const assigneeReward = await calculateIssueAssigneeReward(calculateIncentives);
  const conversationRewards = await calculateIssueConversationReward(context, calculateIncentives);
  const pullRequestReviewersReward = await calculateReviewContributorRewards(context, calculateIncentives);

  await handleIssueClosed({
    context,
    creatorReward,
    assigneeReward,
    conversationRewards,
    pullRequestReviewersReward,
    incentivesCalculation: calculateIncentives,
  });

  return logger.ok("Issue closed successfully");
}

function getEssentials(context: Context) {
  const runtime = Runtime.getState();
  const payload = context.event.payload as Payload;
  const issue = payload.issue;
  if (!issue) throw runtime.logger.error("Missing issue in payload");
  return {
    organization: payload.organization,
    logger: runtime.logger,
    owner: payload.repository.owner.login,
    sender: payload.sender,
    runtime,
    context,
    payload,
    issue,
  };
}
