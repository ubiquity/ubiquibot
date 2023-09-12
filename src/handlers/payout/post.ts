import { getWalletAddress } from "../../adapters/supabase";
import { getBotContext, getLogger } from "../../bindings";
import { getAllIssueComments, getIssueDescription, parseComments } from "../../helpers";
import { Incentives, MarkdownItem, Payload, UserType } from "../../types";
import { RewardsResponse, commentParser } from "../comment";
import Decimal from "decimal.js";
import { bountyInfo } from "../wildcard";
import { IncentivesCalculationResult } from "./action";
import { BigNumber } from "ethers";

export interface CreatorCommentResult {
  title: string;
  account?: string | undefined;
  amountInETH?: Decimal | undefined;
  userId?: string | undefined;
  tokenSymbol?: string | undefined;
  node_id?: string | undefined;
  user?: string | undefined;
}

const ItemsToExclude: string[] = [MarkdownItem.BlockQuote];
/**
 * Incentivize the contributors based on their contribution.
 * The default formula has been defined in https://github.com/ubiquity/ubiquibot/issues/272
 */
export const calculateIssueConversationReward = async (calculateIncentives: IncentivesCalculationResult): Promise<RewardsResponse> => {
  const title = `Conversation Rewards`;
  const logger = getLogger();

  const context = getBotContext();
  const payload = context.payload as Payload;
  const issue = payload.issue;

  const permitComments = calculateIncentives.comments.filter(
    (content) => content.body.includes("Conversation Rewards") && content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    logger.info(`incentivizeComments: skip to generate a permit url because it has been already posted`);
    return { error: `incentivizeComments: skip to generate a permit url because it has been already posted` };
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("incentivizeComments: skipping payment permit generation because `assignee` is `undefined`.");
    return { error: "incentivizeComments: skipping payment permit generation because `assignee` is `undefined`." };
  }

  const issueComments = await getAllIssueComments(calculateIncentives.issue.number, "full");
  logger.info(`Getting the issue comments done. comments: ${JSON.stringify(issueComments)}`);
  const issueCommentsByUser: Record<string, { id: string; comments: string[] }> = {};
  for (const issueComment of issueComments) {
    const user = issueComment.user;
    if (user.type == UserType.Bot || user.login == assignee.login) continue;
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
  logger.info(`Filtering by the user type done. commentsByUser: ${JSON.stringify(issueCommentsByUser)}`);

  // The mapping between gh handle and amount in ETH
  const fallbackReward: Record<string, Decimal> = {};

  // array of awaiting permits to generate
  const reward: { account: string; priceInEth: Decimal; userId: string; user: string; penaltyAmount: BigNumber }[] = [];

  for (const user of Object.keys(issueCommentsByUser)) {
    const commentsByUser = issueCommentsByUser[user];
    const commentsByNode = await parseComments(commentsByUser.comments, ItemsToExclude);
    const rewardValue = calculateRewardValue(commentsByNode, calculateIncentives.incentives);
    if (rewardValue.equals(0)) {
      logger.info(`Skipping to generate a permit url because the reward value is 0. user: ${user}`);
      continue;
    }
    logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    const account = await getWalletAddress(user);
    const priceInEth = rewardValue.mul(calculateIncentives.baseMultiplier);
    if (priceInEth.gt(calculateIncentives.paymentPermitMaxPrice)) {
      logger.info(`Skipping comment reward for user ${user} because reward is higher than payment permit max price`);
      continue;
    }
    if (account) {
      reward.push({ account, priceInEth, userId: commentsByUser.id, user, penaltyAmount: BigNumber.from(0) });
    } else {
      fallbackReward[user] = priceInEth;
    }
  }

  return { error: "", title, reward, fallbackReward };
};

export const calculateIssueCreatorReward = async (incentivesCalculation: IncentivesCalculationResult): Promise<RewardsResponse> => {
  const title = `Task Creator Reward`;
  const logger = getLogger();

  const issueDetailed = bountyInfo(incentivesCalculation.issue);
  if (!issueDetailed.isBounty) {
    logger.info(`incentivizeCreatorComment: its not a bounty`);
    return { error: `incentivizeCreatorComment: its not a bounty` };
  }

  const comments = await getAllIssueComments(incentivesCalculation.issue.number);
  const permitComments = comments.filter(
    (content) => content.body.includes("Task Creator Reward") && content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    logger.info(`incentivizeCreatorComment: skip to generate a permit url because it has been already posted`);
    return { error: `incentivizeCreatorComment: skip to generate a permit url because it has been already posted` };
  }

  const assignees = incentivesCalculation.issue.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("incentivizeCreatorComment: skipping payment permit generation because `assignee` is `undefined`.");
    return { error: "incentivizeCreatorComment: skipping payment permit generation because `assignee` is `undefined`." };
  }

  const description = await getIssueDescription(incentivesCalculation.issue.number, "html");
  if (!description) {
    logger.info(`Skipping to generate a permit url because issue description is empty. description: ${description}`);
    return { error: `Skipping to generate a permit url because issue description is empty. description: ${description}` };
  }
  logger.info(`Getting the issue description done. description: ${description}`);
  const creator = incentivesCalculation.issue.user;
  if (creator.type === UserType.Bot || creator.login === incentivesCalculation.issue.assignee) {
    logger.info("Issue creator assigneed himself or Bot created this issue.");
    return { error: "Issue creator assigneed himself or Bot created this issue." };
  }

  const result = await generatePermitForComments(
    creator.login,
    [description],
    incentivesCalculation.issueCreatorMultiplier,
    incentivesCalculation.incentives,
    incentivesCalculation.paymentPermitMaxPrice
  );

  if (!result || !result.account || !result.amountInETH) {
    throw new Error("Failed to generate permit for issue creator");
  }

  return {
    error: "",
    title,
    userId: creator.node_id,
    username: creator.login,
    reward: [
      {
        priceInEth: result?.amountInETH ?? new Decimal(0),
        account: result?.account,
        userId: "",
        user: "",
        penaltyAmount: BigNumber.from(0),
      },
    ],
  };
};

const generatePermitForComments = async (user: string, comments: string[], multiplier: number, incentives: Incentives, paymentPermitMaxPrice: number) => {
  const logger = getLogger();
  const commentsByNode = await parseComments(comments, ItemsToExclude);
  const rewardValue = calculateRewardValue(commentsByNode, incentives);
  if (rewardValue.equals(0)) {
    logger.info(`No reward for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    return;
  }
  logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
  const account = await getWalletAddress(user);
  const amountInETH = rewardValue.mul(multiplier);
  if (amountInETH.gt(paymentPermitMaxPrice)) {
    logger.info(`Skipping issue creator reward for user ${user} because reward is higher than payment permit max price`);
    return;
  }
  if (account) {
    return { account, amountInETH };
  } else {
    return { account: "0x" };
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
