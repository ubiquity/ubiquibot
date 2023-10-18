import Runtime from "../../../../bindings/bot-runtime";
import { Payload } from "../../../../types/payload";
// import { calculateIssueAssigneeReward } from "../../../payout/calculate-issue-assignee-reward";
// import { calculateIssueConversationReward } from "../../../payout/calculate-issue-conversation-reward";
// import { calculateIssueCreatorReward } from "../../../payout/calculate-issue-creator-reward";
// import { calculateReviewContributorRewards } from "../../../payout/calculate-review-contributor-rewards";
// import { handleIssueClosed } from "../../../payout/handle-issue-closed";
// import { incentivesCalculation } from "../../../payout/incentives-calculation";

export async function issueClosed() {
  const { organization, logger, owner } = getEssentials();

  if (!organization) {
    logger.warn("No organization found in payload, falling back to `owner`");
    if (!owner) {
      throw logger.error("No owner found in payload");
    }
  }

  // // assign function incentivesCalculation to a variable
  // const calculateIncentives = await incentivesCalculation();
  // const creatorReward = await calculateIssueCreatorReward(calculateIncentives);
  // const assigneeReward = await calculateIssueAssigneeReward(calculateIncentives);
  // const conversationRewards = await calculateIssueConversationReward(calculateIncentives);
  // const pullRequestReviewersReward = await calculateReviewContributorRewards(calculateIncentives);

  // await handleIssueClosed({
  //   creatorReward,
  //   assigneeReward,
  //   conversationRewards,
  //   pullRequestReviewersReward,
  //   incentivesCalculation: calculateIncentives,
  // });

  return logger.ok("Issue closed successfully");
}

function getEssentials() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const payload = context.payload as Payload;
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
