import { getWalletAddress } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, generatePermit2Signature, getAllIssueComments, getTokenSymbol, parseComments } from "../../helpers";
import { Payload, UserType } from "../../types";

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
  const issue = payload.issue;
  if (!issue) {
    logger.info(`Not a GitHub issue...skipping.`);
    return;
  }
  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping to proceed the payment because `assignee` is undefined");
    return;
  }

  const issueComments = await getAllIssueComments(payload.issue?.number!);
  const issueCommentsByUser: Record<string, string[]> = {};
  for (const issueComment of issueComments) {
    const user = issueComment.user;
    if (user.type == UserType.Bot || user.login == assignee) continue;
    issueCommentsByUser[user.login].push(issueComment.body);
  }
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);

  // The mapping between gh handle and comment with a permit url
  let reward: Record<string, string> = {};

  // The mapping between gh handle and amount in ETH
  let fallbackReward: Record<string, string> = {};
  let comment: string = "";
  for (const user of Object.keys(issueCommentsByUser)) {
    const comments = issueCommentsByUser[user];
    const rewardValue = await parseComments(comments, commentElementPricing);
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

  logger.info("Permit url generated for contributors", { reward });
  logger.info("Skipping to generate a permit url for missing accounts", { fallbackReward });

  await addCommentToIssue(comment, issue.number);
};
