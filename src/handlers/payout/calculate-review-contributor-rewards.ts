import Decimal from "decimal.js";
import Runtime from "../../bindings/bot-runtime";
import { getAllIssueComments, getAllPullRequestReviews, parseComments } from "../../helpers";
import { getLatestMergedPullRequest, getLinkedPullRequests } from "../../helpers/parser";
import { Context, UserType } from "../../types";

import { calculateRewardValue } from "./calculate-reward-value";
import { IncentivesCalculationResult } from "./incentives-calculation";
import { ItemsToExclude } from "./post";
import { RewardsResponse } from "./handle-issue-closed";

export async function calculateReviewContributorRewards(
  context: Context,
  incentivesCalculation: IncentivesCalculationResult
): Promise<RewardsResponse> {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const title = "Reviewer";
  const user = incentivesCalculation.issue.user;

  const linkedPullRequest = await getLinkedPullRequests({
    owner: incentivesCalculation.payload.repository.owner.login,
    repository: incentivesCalculation.payload.repository.name,
    issue: incentivesCalculation.issue.number,
  });

  const latestLinkedPullRequest = await getLatestMergedPullRequest(context, linkedPullRequest);

  if (!latestLinkedPullRequest) {
    throw logger.info(`No linked pull requests found`);
  }

  const comments = await getAllIssueComments(context, incentivesCalculation.issue.number);
  const permitComments = comments.filter(
    (content) =>
      content.body.includes(title) &&
      content.body.includes("https://pay.ubq.fi?claim=") &&
      content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    throw logger.warn(`skip to generate a permit url because it has been already posted`);
  }

  const assignees = incentivesCalculation.issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    throw logger.warn("skipping payment permit generation because `assignee` is `undefined`.");
  }

  const prReviews = await getAllPullRequestReviews(context, latestLinkedPullRequest.number, "full");
  const prComments = await getAllIssueComments(context, latestLinkedPullRequest.number, "full");

  logger.info(`Getting the pull request reviews done.`, { prReviews }); // I put the brackets around the object to make it easier to read in the logs (you see the variable name)

  const prReviewsByUser: Record<string, { id: string; comments: string[] }> = {};
  for (const review of prReviews) {
    const user = review.user;
    if (!user) continue;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    if (!review.body_html) {
      logger.info(`Skipping to parse the comment because body_html is undefined.`, { review });
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
      logger.info(`Skipping to parse the comment because body_html is undefined.`, { comment });
      continue;
    }
    if (!prReviewsByUser[user.login]) {
      prReviewsByUser[user.login] = { id: user.node_id, comments: [] };
    }
    prReviewsByUser[user.login].comments.push(comment.body_html);
  }

  logger.info(`Filtering by the user type done.`, { prReviewsByUser });

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
      logger.warn(`Skipping to generate a permit url because the reward value is 0.`, { _user });
      continue;
    }
    logger.info("Comment parsed for the user", { _user, commentsByNode, rewardValue: rewardValue.toString() });
    const account = await runtime.adapters.supabase.wallet.getAddress(user.id);
    const priceInDecimal = rewardValue.mul(incentivesCalculation.priceMultiplier);
    if (priceInDecimal.gt(incentivesCalculation.permitMaxPrice)) {
      logger.warn("Skipping comment reward for user because reward is higher than payment permit max price", { _user });
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

  logger.info(`Permit url generated for pull request reviewers.`, { reward });
  logger.info(`Skipping to generate a permit url for missing accounts.`, { fallbackReward });

  return { title, reward, fallbackReward, userId: parseInt(assignee.id), username: assignee.login };
}
