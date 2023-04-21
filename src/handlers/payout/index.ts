import { getWalletAddress, getWalletMultiplier } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, addLabelToIssue, deleteLabel, generatePermit2Signature, getTokenSymbol } from "../../helpers";
import { Payload, StateReason } from "../../types";
import { shortenEthAddress } from "../../utils";
import { bountyInfo } from "../wildcard";

export const handleIssueClosed = async () => {
  const context = getBotContext();
  const {
    payout: { paymentToken, rpc },
    mode: { autoPayMode },
  } = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  if (!issue) return;

  logger.info(`Handling issues.closed event, issue: ${issue.number}`);
  if (!autoPayMode) {
    logger.info(`Skipping to generate permit2 url, reason: { autoPayMode: ${autoPayMode}}`);
    return;
  }
  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`Skipping... its not a bounty`);
    return;
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping to proceed the payment because `assignee` is undefined");
    return;
  }

  if (!issueDetailed.priceLabel) {
    logger.info("Skipping to proceed the payment because price not set");
    return;
  }

  const recipient = await getWalletAddress(assignee.login);
  const multiplier = await getWalletMultiplier(assignee.login);

  // TODO: add multiplier to the priceInEth
  const priceInEth = (+issueDetailed.priceLabel!.substring(7, issueDetailed.priceLabel!.length - 4) * multiplier).toString();

  if (!recipient) {
    if (issue.state_reason === StateReason.COMPLETED) {
      logger.info(`Recipient address is missing`);
      await addCommentToIssue(
        "Please set your wallet address by using the `/wallet` command.\n" +
          "```\n" +
          "/wallet example.eth\n" +
          "/wallet 0xBf...CdA\n" +
          "```\n" +
          "@" +
          assignee.login,
        issue.number
      );
    }
    return;
  }

  if (issue.state_reason === StateReason.COMPLETED) {
    const payoutUrl = await generatePermit2Signature(recipient, priceInEth, issue.node_id);
    const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
    const shortenRecipient = shortenEthAddress(recipient, `[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]`.length);
    logger.info(`Posting a payout url to the issue, url: ${payoutUrl}`);
    const comment = `### [ **[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n` + "```" + shortenRecipient + "```";
    await addCommentToIssue(comment, issue.number);
    await deleteLabel(issueDetailed.priceLabel);
    await addLabelToIssue("Paid");
  }
};
