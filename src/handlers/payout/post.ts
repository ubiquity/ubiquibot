import { getWalletAddress } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, generatePermit2Signature, getAllIssueComments, getIssueDescription, getTokenSymbol, parseComments } from "../../helpers";
import { MarkdownItem, Payload, UserType, CommentElementPricing } from "../../types";

const ItemsToExclude: string[] = [MarkdownItem.BlockQuote];
/**
 * Incentivize the contributors based on their contribution.
 * The default formula has been defined in https://github.com/ubiquity/ubiquibot/issues/272
 */
export const incentivizeComments = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode },
    price: { baseMultiplier, commentElementPricing },
    payout: { paymentToken, rpc },
  } = getBotConfig();
  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    return;
  }
  const context = getBotContext();
  const payload = context.payload as Payload;
  const org = payload.organization?.login;
  const issue = payload.issue;
  if (!issue || !org) {
    logger.info(`Incomplete payload. issue: ${issue}, org: ${org}`);
    return;
  }
  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping payment permit generation because `assignee` is `undefined`.");
    return;
  }

  const issueComments = await getAllIssueComments(issue.number);
  logger.info(`Getting the issue comments done. comments: ${JSON.stringify(issueComments)}`);
  const issueCommentsByUser: Record<string, string[]> = {};
  for (const issueComment of issueComments) {
    const user = issueComment.user;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    issueCommentsByUser[user.login].push(issueComment.body);
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
    const rewardValue = calculateRewardValue(commentsByNode, commentElementPricing);
    logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
    const account = await getWalletAddress(user);
    const amountInETH = ((rewardValue * baseMultiplier) / 1000).toString();
    if (account) {
      const { payoutUrl } = await generatePermit2Signature(account, amountInETH, issue.node_id);
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
    price: { commentElementPricing, issueCreatorMultiplier },
    payout: { paymentToken, rpc },
  } = getBotConfig();
  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    return;
  }
  const context = getBotContext();
  const payload = context.payload as Payload;
  const org = payload.organization?.login;
  const issue = payload.issue;
  if (!issue || !org) {
    logger.info(`Incomplete payload. issue: ${issue}, org: ${org}`);
    return;
  }
  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping payment permit generation because `assignee` is `undefined`.");
    return;
  }

  const description = await getIssueDescription(issue.number);
  logger.info(`Getting the issue description done. description: ${description}`);
  const creator = issue.user;
  if (creator?.type === UserType.Bot || creator?.login === issue?.assignee) {
    logger.info("Issue creator assigneed himself or Bot created this issue.");
    return;
  }

  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const result = await generatePermitForComments(creator?.login, [description], issueCreatorMultiplier, commentElementPricing, tokenSymbol, issue.node_id);

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
  commentElementPricing: Record<string, number>,
  tokenSymbol: string,
  node_id: string
): Promise<{ comment: string; payoutUrl?: string; amountInETH?: string }> => {
  const logger = getLogger();
  const commentsByNode = await parseComments(comments, ItemsToExclude);
  const rewardValue = calculateRewardValue(commentsByNode, commentElementPricing);
  logger.debug(`Comment parsed for the user: ${user}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`);
  const account = await getWalletAddress(user);
  const amountInETH = (rewardValue * multiplier).toString();
  let comment = "";
  if (account) {
    const { payoutUrl } = await generatePermit2Signature(account, amountInETH, node_id);
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
 * @param commentElementPricing - The basic price table for reward calculation
 * @returns - The reward value
 */
const calculateRewardValue = (comments: Record<string, string[]>, commentElementPricing: CommentElementPricing): number => {
  let sum = 0;
  for (const key of Object.keys(comments)) {
    const rewardValue = commentElementPricing[key];
    const value = comments[key];
    if (key == MarkdownItem.Text || key == MarkdownItem.Paragraph) {
      sum += value.length * rewardValue;
    } else {
      sum += rewardValue;
    }
  }

  return sum;
};
