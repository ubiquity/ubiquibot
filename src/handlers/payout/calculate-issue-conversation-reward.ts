import Decimal from "decimal.js";
import Runtime from "../../bindings/bot-runtime";
import { GLOBAL_STRINGS } from "../../configs";
import { getAllIssueComments, parseComments } from "../../helpers";
import { Comment, Payload, UserType } from "../../types";
import { getWalletAddress } from "../comment/handlers/assign/get-wallet-address";
import { calculateRewardValue } from "./calculate-reward-value";
import { IncentivesCalculationResult } from "./incentives-calculation";
import { ItemsToExclude } from "./post";
import { walkComments } from "./walk-comments";
import { RewardsResponse } from "./handle-issue-closed";

// Incentivize the contributors based on their contribution.
// The default formula has been defined in https://github.com/ubiquity/ubiquibot/issues/272
export async function calculateIssueConversationReward(
  calculateIncentives: IncentivesCalculationResult
): Promise<RewardsResponse> {
  const title = `Conversation`;
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const context = runtime.eventContext;
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const user = payload.sender;

  const isBotCommentWithClaim = (content: Comment) =>
    content.body.includes(title) &&
    content.body.includes("https://pay.ubq.fi?claim=") &&
    content.user.type == UserType.Bot;

  const permitComments = calculateIncentives.comments.filter(isBotCommentWithClaim);
  if (permitComments.length > 0)
    throw logger.error("Skipping payment permit generation because payment permit has already been posted.");

  for (const botComment of permitComments.filter((comment: Comment) => comment.user.type === UserType.Bot).reverse()) {
    const botCommentBody = botComment.body;
    if (botCommentBody.includes(GLOBAL_STRINGS.autopayComment)) {
      const pattern = /\*\*(\w+)\*\*/;
      const res = botCommentBody.match(pattern);
      if (res) {
        if (res[1] === "false") {
          throw logger.error("autopay is disabled");
        }
        break;
      }
    }
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee)
    throw logger.info("incentivizeComments: skipping payment permit generation because `assignee` is `undefined`.");

  const issueComments = await getAllIssueComments(calculateIncentives.issue.number, "raw");
  logger.info("Getting the issue comments done.", { issueComments });
  const issueCommentsByUser: Record<string, { id: string; comments: string[] }> = {};

  walkComments({ issueComments, assignee, logger, issueCommentsByUser });

  logger.info("Filtering by user type...", { issueCommentsByUser });

  // The mapping between gh handle and amount in big number
  const fallbackReward: Record<string, Decimal> = {};

  // array of awaiting permits to generate
  const reward: RewardsResponse["reward"] = [];

  for (const _user of Object.keys(issueCommentsByUser)) {
    const commentsByUser = issueCommentsByUser[_user];
    const commentsByNode = parseComments(commentsByUser.comments, ItemsToExclude);
    const rewardValue = calculateRewardValue(commentsByNode, calculateIncentives.incentives);
    if (rewardValue.equals(0)) {
      logger.info("Skipping to generate a permit url because the reward value is 0.", { _user });
      continue;
    }
    logger.debug("Comment parsed for the user", { _user, commentsByNode, rewardValue: rewardValue.toString() });

    const account = await getWalletAddress(user.id);
    const priceInDecimal = rewardValue.mul(calculateIncentives.priceMultiplier);
    if (priceInDecimal.gt(calculateIncentives.permitMaxPrice)) {
      logger.info("Skipping comment reward for user because reward is higher than payment permit max price", { _user });
      continue;
    }
    if (account) {
      reward.push({
        account,
        priceInDecimal,
        userId: parseInt(commentsByUser.id),
        user: _user,
        penaltyAmount: new Decimal(0),
        debug: {
          test: {
            count: Object.keys(commentsByNode).length,
            reward: rewardValue,
          },
        },
      });
    } else {
      fallbackReward[_user] = priceInDecimal;
    }
  }
  return {
    title,
    fallbackReward,
    reward,
    userId: parseInt(assignee.id),
    username: assignee.login,
  };
}
