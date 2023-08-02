import { BigNumber, ethers } from "ethers";
import { getPenalty, getWalletAddress, getWalletMultiplier, removePenalty } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import {
  addLabelToIssue,
  deleteLabel,
  generatePermit2Signature,
  getAllIssueAssignEvents,
  getAllIssueComments,
  getTokenSymbol,
  wasIssueReopened,
} from "../../helpers";
import { UserType, Payload, StateReason } from "../../types";
import { shortenEthAddress } from "../../utils";
import { bountyInfo } from "../wildcard";

export const handleIssueClosed = async () => {
  const context = getBotContext();
  const {
    payout: { paymentToken, rpc, permitBaseUrl, networkId },
    mode: { paymentPermitMaxPrice },
  } = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const { repository, organization } = payload;

  const id = organization?.id || repository?.id; // repository?.id as fallback

  if (!issue) return;

  const comments = await getAllIssueComments(issue.number);

  const wasReopened = await wasIssueReopened(issue.number);
  const claimUrlRegex = new RegExp(`\\((${permitBaseUrl}\\?claim=\\S+)\\)`);
  const permitCommentIdx = comments.findIndex((e) => e.user.type === "Bot" && e.body.match(claimUrlRegex));

  if (wasReopened && permitCommentIdx !== -1) {
    const permitComment = comments[permitCommentIdx];
    const permitUrl = permitComment.body.match(claimUrlRegex);
    if (!permitUrl || permitUrl.length < 2) {
      logger.error(`Permit URL not found`);
      return;
    }
    const url = new URL(permitUrl[1]);
    const claimBase64 = url.searchParams.get("claim");
    if (!claimBase64) {
      logger.error(`Permit claim search parameter not found`);
      return;
    }
    let networkId = url.searchParams.get("network");
    if (!networkId) {
      networkId = "1";
    }
    let claim;
    try {
      claim = JSON.parse(Buffer.from(claimBase64, "base64").toString("utf-8"));
    } catch (err: unknown) {
      logger.error(`${err}`);
      return;
    }
    const amount = BigNumber.from(claim.permit.permitted.amount);
    const tokenAddress = claim.permit.permitted.token;

    // extract assignee
    const events = await getAllIssueAssignEvents(issue.number);
    if (events.length === 0) {
      logger.error(`No assignment found`);
      return;
    }
    const assignee = events[0].assignee.login;

    try {
      await removePenalty(assignee, payload.repository.full_name, tokenAddress, networkId, amount);
    } catch (err) {
      logger.error(`Failed to remove penalty: ${err}`);
      return;
    }

    logger.info(`Penalty removed`);
    return;
  }

  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("Permit generation skipped because the issue was not closed as completed");
    return "Permit generation skipped because the issue was not closed as completed";
  }

  logger.info(`Handling issues.closed event, issue: ${issue.number}`);
  if (!paymentPermitMaxPrice) {
    logger.info(`Skipping to generate permit2 url, reason: { paymentPermitMaxPrice: ${paymentPermitMaxPrice}}`);
    return `Permit generation skipped since paymentPermitMaxPrice is 0`;
  }
  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`Skipping... its not a bounty`);
    return `Permit generation skipped since this issue didn't qualify as bounty`;
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping to proceed the payment because `assignee` is undefined");
    return `Permit generation skipped since assignee is undefined`;
  }

  if (!issueDetailed.priceLabel) {
    logger.info("Skipping to proceed the payment because price not set");
    return `Permit generation skipped since price label is not set`;
  }

  const recipient = await getWalletAddress(assignee.login);
  const { value } = await getWalletMultiplier(assignee.login, id?.toString());

  if (value === 0) {
    const errMsg = "Refusing to generate the payment permit because " + `@${assignee.login}` + "'s payment `multiplier` is `0`";
    logger.info(errMsg);
    return errMsg;
  }

  // TODO: add multiplier to the priceInEth
  let priceInEth = (+issueDetailed.priceLabel.substring(7, issueDetailed.priceLabel.length - 4) * value).toString();
  if (parseInt(priceInEth) > paymentPermitMaxPrice) {
    logger.info("Skipping to proceed the payment because bounty payout is higher than paymentPermitMaxPrice");
    return `Permit generation skipped since issue's bounty is higher than ${paymentPermitMaxPrice}`;
  }
  if (!recipient || recipient?.trim() === "") {
    logger.info(`Recipient address is missing`);
    return;
  }

  // if bounty hunter has any penalty then deduct it from the bounty
  const penaltyAmount = await getPenalty(assignee.login, payload.repository.full_name, paymentToken, networkId.toString());
  if (penaltyAmount.gt(0)) {
    logger.info(`Deducting penalty from bounty`);
    const bountyAmount = ethers.utils.parseUnits(priceInEth, 18);
    const bountyAmountAfterPenalty = bountyAmount.sub(penaltyAmount);
    if (bountyAmountAfterPenalty.lte(0)) {
      await removePenalty(assignee.login, payload.repository.full_name, paymentToken, networkId.toString(), bountyAmount);
      const msg = `Permit generation skipped because bounty amount after penalty is 0`;
      logger.info(msg);
      return msg;
    }
    priceInEth = ethers.utils.formatUnits(bountyAmountAfterPenalty, 18);
  }

  const payoutUrl = await generatePermit2Signature(recipient, priceInEth, issue.node_id);
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const shortenRecipient = shortenEthAddress(recipient, `[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]`.length);
  logger.info(`Posting a payout url to the issue, url: ${payoutUrl}`);
  const comment = `### [ **[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n` + "```" + shortenRecipient + "```";
  const permitComments = comments.filter((content) => content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot);
  if (permitComments.length > 0) {
    logger.info(`Skip to generate a permit url because it has been already posted`);
    return `Permit generation skipped because it was already posted to this issue.`;
  }
  await deleteLabel(issueDetailed.priceLabel);
  await addLabelToIssue("Permitted");
  if (penaltyAmount.gt(0)) {
    await removePenalty(assignee.login, payload.repository.full_name, paymentToken, networkId.toString(), penaltyAmount);
  }
  return comment;
};
