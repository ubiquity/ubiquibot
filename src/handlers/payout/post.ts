import { getWalletAddress } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, generatePermit2Signature, getAllIssueComments, getIssueDescription, getTokenSymbol, parseComments } from "../../helpers";
import { MarkdownItem, Payload, UserType, CommentElementPricing, Issue } from "../../types";

const ItemsToExclude: string[] = [MarkdownItem.BlockQuote];
/**
 * Incentivize the contributors based on their contribution.
 * The default formula has been defined in https://github.com/ubiquity/ubiquibot/issues/272
 */
export const incentivizeComments = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode },
    price: { baseMultiplier, commentElementPricing, issueCreatorMultiplier },
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

  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);

  const issueComments = await getAllIssueComments(payload.issue?.number!);
  logger.info(`Getting the issue comments done. comments: ${JSON.stringify(issueComments)}`);

  const description = await getIssueDescription(payload.issue?.number!);
  incentivizeCreatorComment(issueCreatorMultiplier, commentElementPricing, tokenSymbol, issue, description);

  const issueCommentsByUser: Record<string, string[]> = {};
  for (const issueComment of issueComments) {
    const user = issueComment.user;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    issueCommentsByUser[user.login].push(issueComment.body);
  }
  logger.info(`Filtering by the user type done. commentsByUser: ${JSON.stringify(issueCommentsByUser)}`);

  // The mapping between gh handle and comment with a permit url
  let reward: Record<string, string> = {};

  // The mapping between gh handle and amount in ETH
  let fallbackReward: Record<string, string> = {};
  for (const user of Object.keys(issueCommentsByUser)) {
    const comments = issueCommentsByUser[user];
    const result = await generatePermitForCommit(user, comments, baseMultiplier, commentElementPricing, tokenSymbol, issue.node_id);
    if (result.payoutUrl) reward[user] = result.payoutUrl;
    if (result.amountInETH) fallbackReward[user] = result.amountInETH;
    if (result.comment !== "") await addCommentToIssue(result.comment, issue.number);
  }

  logger.info(`Permit url generated for contributors. reward: ${JSON.stringify(reward)}`);
  logger.info(`Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(fallbackReward)}`);
};

export const incentivizeCreatorComment = async (
  issueCreatorMultiplier: number,
  commentElementPricing: Record<string, number>,
  tokenSymbol: string,
  issue: Issue,
  description: string
) => {
  const logger = getLogger();
  const creator = issue.user;
  if (!(creator.type == UserType.Bot || creator.login == issue.assignee)) {
    const comments = [description];
    const result = await generatePermitForCommit(creator.login, comments, issueCreatorMultiplier, commentElementPricing, tokenSymbol, issue.node_id);
    if (result.payoutUrl) logger.info(`Permit url generated for creator. reward: ${result.payoutUrl}`);
    if (result.amountInETH) logger.info(`Skipping to generate a premit url for missing creator. fallback:${result.amountInETH}`);
    if (result.comment !== "") await addCommentToIssue(result.comment, issue.number);
  }
};

const generatePermitForCommit = async (
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
  const amountInETH = ((rewardValue * multiplier) / 1000).toString();
  let comment: string = "";
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
