import { getWalletAddress } from "../../adapters/supabase";
import { getBotConfig, getBotContext } from "../../bindings";
import { addCommentToIssue, generatePermit2Signature, getTokenSymbol } from "../../helpers";
import { Payload } from "../../types";
import { shortenEthAddress } from "../../utils";
import { bountyInfo } from "../wildcard";

export const handleIssueClosed = async () => {
  const context = getBotContext();
  const {
    payout: { paymentToken, rpc },
  } = getBotConfig();
  const { log } = context;
  const payload = context.payload as Payload;
  const issue = payload.issue;
  if (!issue) return;

  log.info(`Handling issues.closed event, issue: ${issue.number}`);
  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    log.info(`Skipping... its not a bounty`);
    return;
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    log.info("Skipping to proceed the payment because `assignee` is undefined");
    return;
  }

  if (!issueDetailed.priceLabel) {
    log.info("Skipping to proceed the payment because price not set");
    return;
  }

  const priceInEth = issueDetailed.priceLabel!.substring(7, issueDetailed.priceLabel!.length - 4);
  console.log({ assignee });
  const recipient = await getWalletAddress(assignee.login);
  if (!recipient) {
    log.info(`Recipient address is missing`);
    await addCommentToIssue(`@${assignee.login} would you please post your wallet address here?`, issue.number);
    return;
  }

  const payoutUrl = await generatePermit2Signature(recipient, priceInEth);
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const shortenRecipient = shortenEthAddress(recipient);
  log.info(`Posting a payout url to the issue, url: ${payoutUrl}`);
  const comment = `### [ **[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n` + "```" + shortenRecipient + "```";
  await addCommentToIssue(comment, issue.number);
};
