import { getWalletAddress } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import {
  addCommentToIssue,
  generatePermit2Signature,
  getAllIssueComments,
  getAllPullRequestReviews,
  getIssueDescription,
  getTokenSymbol,
  parseComments,
} from "../../helpers";
import { gitLinkedPrParser } from "../../helpers/parser";
import { Incentives, MarkdownItem, Payload, StateReason, UserType } from "../../types";
import { commentParser } from "../comment";
import Decimal from "decimal.js";
import { bountyInfo } from "../wildcard";

const ItemsToExclude: string[] = [MarkdownItem.BlockQuote];
/**
 * Incentivize the contributors based on their contribution.
 * The default formula has been defined in https://github.com/ubiquity/ubiquibot/issues/272
 */
export const incentivizeComments = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode, paymentPermitMaxPrice },
    price: { baseMultiplier, incentives },
    payout: { paymentToken, rpc },
  } = getBotConfig();
  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    return;
  }
  const context = getBotContext();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  if (!issue) {
    logger.info(`Incomplete payload. issue: ${issue}`);
    return;
  }

  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("incentivizeComments: comment incentives disabled because the issue was not closed as completed.");
    return;
  }

  if (!paymentPermitMaxPrice) {
    logger.info(`incentivizeComments: skipping to generate permit2 url, reason: { paymentPermitMaxPrice: ${paymentPermitMaxPrice}}`);
    return;
  }

  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`incentivizeComments: its not a bounty`);
    return;
  }

  const comments = await getAllIssueComments(issue.number);
  const permitComments = comments.filter(
    (content) => content.body.includes("Conversation Rewards") && content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    logger.info(`incentivizeComments: skip to generate a permit url because it has been already posted`);
    return;
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("incentivizeComments: skipping payment permit generation because `assignee` is `undefined`.");
    return;
  }

  const issueComments = await getAllIssueComments(issue.number, "full");
  logger.info(`Getting the issue comments done. comments: ${JSON.stringify(issueComments)}`);
  const issueCommentsByUser: Record<string, { id: string; comments: string[] }> = {};
  for (const issueComment of issueComments) {
    const user = issueComment.user;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    const commands = commentParser(issueComment.body);
    if (commands.length > 0) {
      logger.info(`Skipping to parse the comment because it contains commands. comment: ${JSON.stringify(issueComment)}`);
      continue;
    }
    if (!issueComment.body_html) {
      logger.info(`Skipping to parse the comment because body_html is undefined. comment: ${JSON.stringify(issueComment)}`);
      continue;
    }

    // Store the comment along with user's login and node_id
    if (!issueCommentsByUser[user.login]) {
      issueCommentsByUser[user.login] = { id: user.node_id, comments: [] };
    }
    issueCommentsByUser[user.login].comments.push(issueComment.body_html);
  }
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  logger.info(`Filtering by the user type done. commentsByUser: ${JSON.stringify(issueCommentsByUser)}`);

  // The mapping between gh handle and comment with a permit url
  const reward: Record<string, string> = {};

  // The mapping between gh handle and amount in ETH
  const fallbackReward: Record<string, Decimal> = {};
  let comment = `#### Conversation Rewards\n`;
  for (const user of Object.keys(issueCommentsByUser)) {
    const commentsByUser = issueCommentsByUser[user];
    const commentsByNode = await parseComments(commentsByUser.comments, ItemsToExclude);
    const rewardValue = calculateRewardValue(commentsByNode, incentives);
    if (rewardValue.equals(0)) {
      logger.info(`Skipping to generate a permit url because the reward value is 0. user: ${user}`);
      continue;
    }
    logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    const account = await getWalletAddress(user);
    const amountInETH = rewardValue.mul(baseMultiplier);
    if (amountInETH.gt(paymentPermitMaxPrice)) {
      logger.info(`Skipping comment reward for user ${user} because reward is higher than payment permit max price`);
      continue;
    }
    if (account) {
      const { payoutUrl } = await generatePermit2Signature(account, amountInETH, issue.node_id, commentsByUser.id, "ISSUE_COMMENTER");
      comment = `${comment}### [ **${user}: [ CLAIM ${amountInETH} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n`;
      reward[user] = payoutUrl;
    } else {
      fallbackReward[user] = amountInETH;
    }
  }

  logger.info(`Permit url generated for contributors. reward: ${JSON.stringify(reward)}`);
  logger.info(`Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(fallbackReward)}`);

  await addCommentToIssue(comment, issue.number);
};

export const incentivizePullRequestReviews = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode, paymentPermitMaxPrice },
    price: { baseMultiplier, incentives },
    payout: { paymentToken, rpc },
  } = getBotConfig();
  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    return;
  }
  const context = getBotContext();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  if (!issue) {
    logger.info(`Incomplete payload. issue: ${issue}`);
    return;
  }

  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("incentivizePullRequestReviews: comment incentives skipped because the issue was not closed as completed");
    return;
  }

  if (paymentPermitMaxPrice == 0 || !paymentPermitMaxPrice) {
    logger.info(`incentivizePullRequestReviews: skipping to generate permit2 url, reason: { paymentPermitMaxPrice: ${paymentPermitMaxPrice}}`);
    return;
  }

  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`incentivizePullRequestReviews: its not a bounty`);
    return;
  }

  const linkedPullRequest = await gitLinkedPrParser({ owner: payload.repository.owner.login, repo: payload.repository.name, issue_number: issue.number });

  if (!linkedPullRequest) {
    logger.debug(`incentivizePullRequestReviews: No linked pull requests found`);
    return;
  }

  const comments = await getAllIssueComments(issue.number);
  const permitComments = comments.filter(
    (content) => content.body.includes("Reviewer Rewards") && content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    logger.info(`incentivizePullRequestReviews: skip to generate a permit url because it has been already posted`);
    return;
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("incentivizePullRequestReviews: skipping payment permit generation because `assignee` is `undefined`.");
    return;
  }

  const prReviews = await getAllPullRequestReviews(context, linkedPullRequest.number, "full");
  const prComments = await getAllIssueComments(linkedPullRequest.number, "full");
  logger.info(`Getting the PR reviews done. comments: ${JSON.stringify(prReviews)}`);
  const prReviewsByUser: Record<string, { id: string; comments: string[] }> = {};
  for (const review of prReviews) {
    const user = review.user;
    if (!user) continue;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    if (!review.body_html) {
      logger.info(`incentivizePullRequestReviews: Skipping to parse the comment because body_html is undefined. comment: ${JSON.stringify(review)}`);
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
      logger.info(`incentivizePullRequestReviews: Skipping to parse the comment because body_html is undefined. comment: ${JSON.stringify(comment)}`);
      continue;
    }
    if (!prReviewsByUser[user.login]) {
      prReviewsByUser[user.login] = { id: user.node_id, comments: [] };
    }
    prReviewsByUser[user.login].comments.push(comment.body_html);
  }
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  logger.info(`incentivizePullRequestReviews: Filtering by the user type done. commentsByUser: ${JSON.stringify(prReviewsByUser)}`);

  // The mapping between gh handle and comment with a permit url
  const reward: Record<string, string> = {};

  // The mapping between gh handle and amount in ETH
  const fallbackReward: Record<string, Decimal> = {};
  let comment = `#### Reviewer Rewards\n`;
  for (const user of Object.keys(prReviewsByUser)) {
    const commentByUser = prReviewsByUser[user];
    const commentsByNode = await parseComments(commentByUser.comments, ItemsToExclude);
    const rewardValue = calculateRewardValue(commentsByNode, incentives);
    if (rewardValue.equals(0)) {
      logger.info(`incentivizePullRequestReviews: Skipping to generate a permit url because the reward value is 0. user: ${user}`);
      continue;
    }
    logger.info(`incentivizePullRequestReviews: Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    const account = await getWalletAddress(user);
    const amountInETH = rewardValue.mul(baseMultiplier);
    if (amountInETH.gt(paymentPermitMaxPrice)) {
      logger.info(`incentivizePullRequestReviews: Skipping comment reward for user ${user} because reward is higher than payment permit max price`);
      continue;
    }
    if (account) {
      const { payoutUrl } = await generatePermit2Signature(account, amountInETH, issue.node_id, commentByUser.id, "ISSUE_COMMENTER");
      comment = `${comment}### [ **${user}: [ CLAIM ${amountInETH} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n`;
      reward[user] = payoutUrl;
    } else {
      fallbackReward[user] = amountInETH;
    }
  }

  logger.info(`incentivizePullRequestReviews: Permit url generated for pull request reviewers. reward: ${JSON.stringify(reward)}`);
  logger.info(`incentivizePullRequestReviews: Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(fallbackReward)}`);

  await addCommentToIssue(comment, issue.number);
};

export const incentivizeCreatorComment = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode, paymentPermitMaxPrice },
    price: { incentives, issueCreatorMultiplier },
    payout: { paymentToken, rpc },
  } = getBotConfig();
  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    return;
  }
  const context = getBotContext();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  if (!issue) {
    logger.info(`Incomplete payload. issue: ${issue}`);
    return;
  }

  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("incentivizeCreatorComment: comment incentives disabled because the issue was not closed as completed.");
    return;
  }

  if (paymentPermitMaxPrice == 0 || !paymentPermitMaxPrice) {
    logger.info(`incentivizeCreatorComment: skipping to generate permit2 url, reason: { paymentPermitMaxPrice: ${paymentPermitMaxPrice}}`);
    return;
  }

  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`incentivizeCreatorComment: its not a bounty`);
    return;
  }

  const comments = await getAllIssueComments(issue.number);
  const permitComments = comments.filter(
    (content) => content.body.includes("Task Creator Reward") && content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    logger.info(`incentivizeCreatorComment: skip to generate a permit url because it has been already posted`);
    return;
  }

  const assignees = issue.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("incentivizeCreatorComment: skipping payment permit generation because `assignee` is `undefined`.");
    return;
  }

  const description = await getIssueDescription(issue.number, "html");
  if (!description) {
    logger.info(`Skipping to generate a permit url because issue description is empty. description: ${description}`);
    return;
  }
  logger.info(`Getting the issue description done. description: ${description}`);
  const creator = issue.user;
  if (creator.type === UserType.Bot || creator.login === issue.assignee) {
    logger.info("Issue creator assigneed himself or Bot created this issue.");
    return;
  }

  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const result = await generatePermitForComments(
    creator.login,
    creator.node_id,
    [description],
    issueCreatorMultiplier,
    incentives,
    tokenSymbol,
    issue.node_id,
    paymentPermitMaxPrice
  );

  if (result.payoutUrl) {
    logger.info(`Permit url generated for creator. reward: ${result.payoutUrl}`);
    await addCommentToIssue(result.comment, issue.number);
  }
  if (result.amountInETH) {
    logger.info(`Skipping to generate a permit url for missing account. fallback: ${result.amountInETH}`);
  }
};

const generatePermitForComments = async (
  user: string,
  userId: string,
  comments: string[],
  multiplier: number,
  incentives: Incentives,
  tokenSymbol: string,
  node_id: string,
  paymentPermitMaxPrice: number
): Promise<{ comment: string; payoutUrl?: string; amountInETH?: Decimal }> => {
  const logger = getLogger();
  const commentsByNode = await parseComments(comments, ItemsToExclude);
  const rewardValue = calculateRewardValue(commentsByNode, incentives);
  if (rewardValue.equals(0)) {
    logger.info(`No reward for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    return { comment: "" };
  }
  logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
  const account = await getWalletAddress(user);
  const amountInETH = rewardValue.mul(multiplier);
  if (amountInETH.gt(paymentPermitMaxPrice)) {
    logger.info(`Skipping issue creator reward for user ${user} because reward is higher than payment permit max price`);
    return { comment: "" };
  }
  let comment = `#### Task Creator Reward\n`;
  if (account) {
    const { payoutUrl } = await generatePermit2Signature(account, amountInETH, node_id, userId, "ISSUE_CREATOR");
    comment = `${comment}### [ **${user}: [ CLAIM ${amountInETH} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n`;
    return { comment, payoutUrl };
  } else {
    return { comment, amountInETH };
  }
};
/**
 * @dev Calculates the reward values for a given comments. We'll improve the formula whenever we get the better one.
 *
 * @param comments - The comments to calculate the reward for
 * @param incentives - The basic price table for reward calculation
 * @returns - The reward value
 */
const calculateRewardValue = (comments: Record<string, string[]>, incentives: Incentives): Decimal => {
  let sum = new Decimal(0);
  for (const key of Object.keys(comments)) {
    const value = comments[key];

    // if it's a text node calculate word count and multiply with the reward value
    if (key == "#text") {
      if (!incentives.comment.totals.word) {
        continue;
      }
      const wordReward = new Decimal(incentives.comment.totals.word);
      const reward = wordReward.mul(value.map((str) => str.trim().split(" ").length).reduce((totalWords, wordCount) => totalWords + wordCount, 0));
      sum = sum.add(reward);
    } else {
      if (!incentives.comment.elements[key]) {
        continue;
      }
      const rewardValue = new Decimal(incentives.comment.elements[key]);
      const reward = rewardValue.mul(value.length);
      sum = sum.add(reward);
    }
  }

  return sum;
};
