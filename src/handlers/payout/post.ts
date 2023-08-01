import { getWalletAddress } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, generatePermit2Signature, getAllIssueComments, getIssueDescription, getTokenSymbol, parseComments } from "../../helpers";
import { Incentives, Payload, UserType } from "../../types";
import { commentParser } from "../comment";

const ItemsToExclude: string[] = ["blockquote"];
/**
 * Incentivize the contributors based on their contribution.
 * The default formula has been defined in https://github.com/ubiquity/ubiquibot/issues/272
 */
export const incentivizeComments = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode },
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

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping payment permit generation because `assignee` is `undefined`.");
    return;
  }

  const issueComments = await getAllIssueComments(issue.number, "full");
  logger.info(`Getting the issue comments done. comments: ${JSON.stringify(issueComments)}`);
  const issueCommentsByUser: Record<string, string[]> = {};
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
    if (!issueCommentsByUser[user.login]) {
      issueCommentsByUser[user.login] = [];
    }
    issueCommentsByUser[user.login].push(issueComment.body_html);
  }
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  logger.info(`Filtering by the user type done. commentsByUser: ${JSON.stringify(issueCommentsByUser)}`);

  // The mapping between gh handle and comment with a permit url
  const reward: Record<string, string> = {};

  // The mapping between gh handle and amount in ETH
  const fallbackReward: Record<string, string> = {};
  let comment = "";
  for (const user of Object.keys(issueCommentsByUser)) {
    const comments = issueCommentsByUser[user];
    const commentsByNode = await parseComments(comments, ItemsToExclude);
    const rewardValue = calculateRewardValue(commentsByNode, incentives);
    if (rewardValue === 0) {
      logger.info(`Skipping to generate a permit url because the reward value is 0. user: ${user}`);
      continue;
    }
    logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    const account = await getWalletAddress(user);
    const amountInETH = ((rewardValue * baseMultiplier) / 1000).toString();
    if (account) {
      const payoutUrl = await generatePermit2Signature(account, amountInETH, issue.node_id);
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

export const incentivizeCreatorComment = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode },
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

  const assignees = issue.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping payment permit generation because `assignee` is `undefined`.");
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
  const result = await generatePermitForComments(creator.login, [description], issueCreatorMultiplier, incentives, tokenSymbol, issue.node_id);

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
  comments: string[],
  multiplier: number,
  incentives: Incentives,
  tokenSymbol: string,
  node_id: string
): Promise<{ comment: string; payoutUrl?: string; amountInETH?: string }> => {
  const logger = getLogger();
  const commentsByNode = await parseComments(comments, ItemsToExclude);
  const rewardValue = calculateRewardValue(commentsByNode, incentives);
  if (rewardValue === 0) {
    logger.info(`No reward for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    return { comment: "" };
  }
  logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
  const account = await getWalletAddress(user);
  const amountInETH = ((rewardValue * multiplier) / 1000).toString();
  let comment = "";
  if (account) {
    const payoutUrl = await generatePermit2Signature(account, amountInETH, node_id);
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
const calculateRewardValue = (comments: Record<string, string[]>, incentives: Incentives): number => {
  let sum = 0;
  for (const key of Object.keys(comments)) {
    const value = comments[key];

    // if it's a text node calculate word count and multiply with the reward value
    if (key == "#text") {
      const wordReward = incentives.comment.totals.word;
      if (!wordReward) {
        continue;
      }
      sum += value.map((str) => str.trim().split(" ").length).reduce((totalWords, wordCount) => totalWords + wordCount, 0) * wordReward;
    } else {
      const rewardValue = incentives.comment.elements[key];
      if (!rewardValue) {
        continue;
      }
      sum += rewardValue;
    }
  }

  return sum;
};
