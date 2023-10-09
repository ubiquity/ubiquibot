import Decimal from "decimal.js";
import Runtime from "../../bindings/bot-runtime";
import { getAllIssueComments, getAllPullRequestReviews, parseComments } from "../../helpers";
import { getLatestPullRequest, gitLinkedPrParser } from "../../helpers/parser";
import { UserType } from "../../types";
import { RewardsResponse } from "../comment/handlers";
import { getWalletAddress } from "../comment/handlers/assign/get-wallet-address";
import { calculateRewardValue } from "./calculate-reward-value";
import { IncentivesCalculationResult } from "./incentives-calculation";
import { ItemsToExclude } from "./post";

export async function calculateReviewContributorRewards(
  incentivesCalculation: IncentivesCalculationResult
): Promise<RewardsResponse> {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const context = runtime.eventContext;
  const title = "Reviewer";
  const user = incentivesCalculation.issue.user;

  const linkedPullRequest = await gitLinkedPrParser({
    owner: incentivesCalculation.payload.repository.owner.login,
    repo: incentivesCalculation.payload.repository.name,
    issue_number: incentivesCalculation.issue.number,
  });

  const latestLinkedPullRequest = await getLatestPullRequest(linkedPullRequest);

  if (!latestLinkedPullRequest) {
    logger.debug(`calculateReviewContributorRewards: No linked pull requests found`);
    return { error: `calculateReviewContributorRewards: No linked pull requests found` };
  }

  const comments = await getAllIssueComments(incentivesCalculation.issue.number);
  const permitComments = comments.filter(
    (content) =>
      content.body.includes(title) &&
      content.body.includes("https://pay.ubq.fi?claim=") &&
      content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    logger.info(`calculateReviewContributorRewards: skip to generate a permit url because it has been already posted`);
    return {
      error: `calculateReviewContributorRewards: skip to generate a permit url because it has been already posted`,
    };
  }

  const assignees = incentivesCalculation.issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info(
      "calculateReviewContributorRewards: skipping payment permit generation because `assignee` is `undefined`."
    );
    return {
      error: "calculateReviewContributorRewards: skipping payment permit generation because `assignee` is `undefined`.",
    };
  }

  const prReviews = await getAllPullRequestReviews(context, latestLinkedPullRequest.number, "full");
  const prComments = await getAllIssueComments(latestLinkedPullRequest.number, "full");
  logger.info(`Getting the PR reviews done. comments: ${JSON.stringify(prReviews)}`);
  const prReviewsByUser: Record<string, { id: string; comments: string[] }> = {};
  for (const review of prReviews) {
    const user = review.user;
    if (!user) continue;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    if (!review.body_html) {
      logger.info(
        `calculateReviewContributorRewards: Skipping to parse the comment because body_html is undefined. comment: ${JSON.stringify(
          review
        )}`
      );
      continue;
    }
    if (!prReviewsByUser[user.login]) {
      prReviewsByUser[user.login] = { id: user.node_id, comments: [] };
    }
    prReviewsByUser[user.login].comments.push(review.body_html);
  }

  for (const comment of prComments) {
    const user = comment.user;
    if (!user) continue;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    if (!comment.body_html) {
      logger.info(
        `calculateReviewContributorRewards: Skipping to parse the comment because body_html is undefined. comment: ${JSON.stringify(
          comment
        )}`
      );
      continue;
    }
    if (!prReviewsByUser[user.login]) {
      prReviewsByUser[user.login] = { id: user.node_id, comments: [] };
    }
    prReviewsByUser[user.login].comments.push(comment.body_html);
  }

  logger.info(
    `calculateReviewContributorRewards: Filtering by the user type done. commentsByUser: ${JSON.stringify(
      prReviewsByUser
    )}`
  );

  // array of awaiting permits to generate
  const reward: {
    account: string;
    priceInDecimal: Decimal;
    userId: number;
    user: string;
    penaltyAmount: Decimal;
  }[] = [];

  // The mapping between gh handle and amount in big number
  const fallbackReward: Record<string, Decimal> = {};

  for (const _user of Object.keys(prReviewsByUser)) {
    const commentByUser = prReviewsByUser[_user];
    const commentsByNode = parseComments(commentByUser.comments, ItemsToExclude);
    const rewardValue = calculateRewardValue(commentsByNode, incentivesCalculation.incentives);
    if (rewardValue.equals(0)) {
      logger.info(
        `calculateReviewContributorRewards: Skipping to generate a permit url because the reward value is 0. user: ${_user}`
      );
      continue;
    }
    logger.info(
      `calculateReviewContributorRewards: Comment parsed for the user: ${_user}. comments: ${JSON.stringify(
        commentsByNode
      )}, sum: ${rewardValue}`
    );
    const account = await getWalletAddress(user.id);
    const priceInDecimal = rewardValue.mul(incentivesCalculation.baseMultiplier);
    if (priceInDecimal.gt(incentivesCalculation.permitMaxPrice)) {
      logger.info(
        `calculateReviewContributorRewards: Skipping comment reward for user ${_user} because reward is higher than payment permit max price`
      );
      continue;
    }

    if (account) {
      reward.push({
        account,
        priceInDecimal,
        userId: parseInt(commentByUser.id),
        user: _user,
        penaltyAmount: new Decimal(0),
      });
    } else {
      fallbackReward[_user] = priceInDecimal;
    }
  }

  logger.info(
    `calculateReviewContributorRewards: Permit url generated for pull request reviewers. reward: ${JSON.stringify(
      reward
    )}`
  );
  logger.info(
    `calculateReviewContributorRewards: Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(
      fallbackReward
    )}`
  );

  return { error: "", title, reward, fallbackReward };
}
