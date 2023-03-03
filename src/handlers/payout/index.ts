import { getWalletAddress } from "../../adapters/supabase";
import { getBotContext } from "../../bindings";
import { RESERVED_USERNAMES } from "../../configs";
import { addCommentToIssue, generatePermit2Signature } from "../../helpers";
import { Payload } from "../../types";
import { bountyInfo } from "../wildcard";

export const handleIssueClosed = async () => {
  const context = getBotContext();
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
    const {
      data: { state_reason },
    } = await context.octokit.issues.get({
      owner: payload.organization!.login,
      repo: payload.repository.name,
      issue_number: issue.number,
    });
    if (!RESERVED_USERNAMES[assignee.login] && state_reason === "completed") {
      log.info(`Recipient address is missing`);
      await addCommentToIssue(`@${assignee.login} would you please post your wallet address here?`, issue.number);
    }
    return;
  }

  const payoutUrl = await generatePermit2Signature(recipient, priceInEth);
  log.info(`Posing a payout url to the issue, url: ${payoutUrl}`);
  await addCommentToIssue(`@${assignee.login} **[ [ CLAIM ${priceInEth} ]** ](${payoutUrl}) for ${recipient}`, issue.number);
};
