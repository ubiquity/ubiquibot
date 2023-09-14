import { BigNumber, ethers } from "ethers";
import { getPenalty, getWalletAddress, getWalletMultiplier, removePenalty } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import {
  addLabelToIssue,
  checkUserPermissionForRepoAndOrg,
  clearAllPriceLabelsOnIssue,
  deleteLabel,
  generatePermit2Signature,
  getAllIssueComments,
  getTokenSymbol,
  savePermitToDB,
  wasIssueReopened,
  getAllIssueAssignEvents,
} from "../../helpers";
import { UserType, Payload, StateReason } from "../../types";
import { shortenEthAddress } from "../../utils";
import { bountyInfo } from "../wildcard";
import Decimal from "decimal.js";
import { GLOBAL_STRINGS } from "../../configs";
import { isParentIssue } from "../pricing";
import { DEFAULT_PERMIT_BASE_URL } from "../../configs";

export const handleIssueClosed = async () => {
  const context = getBotContext();
  const {
    payout: { paymentToken, rpc, permitBaseUrl, networkId, privateKey },
    mode: { paymentPermitMaxPrice },
    accessControl,
  } = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const { repository, organization } = payload;

  const id = organization?.id || repository?.id; // repository?.id as fallback

  if (!issue) return;

  if (accessControl.organization) {
    const userHasPermission = await checkUserPermissionForRepoAndOrg(payload.sender.login, context);

    if (!userHasPermission) return "Permit generation disabled because this issue has been closed by an external contributor.";
  }

  const comments = await getAllIssueComments(issue.number);

  const wasReopened = await wasIssueReopened(issue.number);
  const claimUrlRegex = new RegExp(`\\((${permitBaseUrl}\\?claim=\\S+)\\)`);
  const permitCommentIdx = comments.findIndex((e) => e.user.type === UserType.Bot && e.body.match(claimUrlRegex));

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
  if (privateKey == "") {
    logger.info("Permit generation disabled because wallet private key is not set.");
    return "Permit generation disabled because wallet private key is not set.";
  }
  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("Permit generation disabled because this is marked as unplanned.");
    return "Permit generation disabled because this is marked as unplanned.";
  }

  logger.info(`Checking if the issue is a parent issue.`);
  if (issue.body && isParentIssue(issue.body)) {
    logger.error("Permit generation disabled because this is a collection of issues.");
    await clearAllPriceLabelsOnIssue();
    return "Permit generation disabled because this is a collection of issues.";
  }

  logger.info(`Handling issues.closed event, issue: ${issue.number}`);
  for (const botComment of comments.filter((cmt) => cmt.user.type === UserType.Bot).reverse()) {
    const botCommentBody = botComment.body;
    if (botCommentBody.includes(GLOBAL_STRINGS.autopayComment)) {
      const pattern = /\*\*(\w+)\*\*/;
      const res = botCommentBody.match(pattern);
      if (res) {
        if (res[1] === "false") {
          logger.info(`Skipping to generate permit2 url, reason: autoPayMode for this issue: false`);
          return `Permit generation disabled because automatic payment for this issue is disabled.`;
        }
        break;
      }
    }
  }

  if (paymentPermitMaxPrice == 0 || !paymentPermitMaxPrice) {
    logger.info(`Skipping to generate permit2 url, reason: { paymentPermitMaxPrice: ${paymentPermitMaxPrice}}`);
    return `Permit generation disabled because paymentPermitMaxPrice is 0.`;
  }

  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`Skipping... its not a bounty.`);
    return `Permit generation disabled because this issue didn't qualify as bounty.`;
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping to proceed the payment because `assignee` is undefined.");
    return `Permit generation disabled because assignee is undefined.`;
  }

  if (!issueDetailed.priceLabel) {
    logger.info("Skipping to proceed the payment because price not set");
    return `Permit generation disabled because price label is not set.`;
  }

  const recipient = await getWalletAddress(assignee.login);
  if (!recipient || recipient?.trim() === "") {
    logger.info(`Recipient address is missing`);
    return;
  }

  const { value: multiplier } = await getWalletMultiplier(assignee.login, id?.toString());

  if (multiplier === 0) {
    const errMsg = "Refusing to generate the payment permit because " + `@${assignee.login}` + "'s payment `multiplier` is `0`";
    logger.info(errMsg);
    return errMsg;
  }

  let priceInEth = new Decimal(issueDetailed.priceLabel.substring(7, issueDetailed.priceLabel.length - 4)).mul(multiplier);
  if (priceInEth.gt(paymentPermitMaxPrice)) {
    logger.info("Skipping to proceed the payment because bounty payout is higher than paymentPermitMaxPrice.");
    return `Permit generation disabled because issue's bounty is higher than ${paymentPermitMaxPrice}.`;
  }

  // if bounty hunter has any penalty then deduct it from the bounty
  const penaltyAmount = await getPenalty(assignee.login, payload.repository.full_name, paymentToken, networkId.toString());
  if (penaltyAmount.gt(0)) {
    logger.info(`Deducting penalty from bounty`);
    const bountyAmount = ethers.utils.parseUnits(priceInEth.toString(), 18);
    const bountyAmountAfterPenalty = bountyAmount.sub(penaltyAmount);
    if (bountyAmountAfterPenalty.lte(0)) {
      await removePenalty(assignee.login, payload.repository.full_name, paymentToken, networkId.toString(), bountyAmount);
      const msg = `Permit generation disabled because bounty amount after penalty is 0.`;
      logger.info(msg);
      return msg;
    }
    priceInEth = new Decimal(ethers.utils.formatUnits(bountyAmountAfterPenalty, 18));
  }

  const { txData, payoutUrl } = await generatePermit2Signature(recipient, priceInEth, issue.node_id, assignee.node_id, "ISSUE_ASSIGNEE");
  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);
  const shortenRecipient = shortenEthAddress(recipient, `[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]`.length);
  logger.info(`Posting a payout url to the issue, url: ${payoutUrl}`);
  const comment =
    `#### Task Assignee Reward\n### [ **[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n` + "```" + shortenRecipient + "```";
  const permitComments = comments.filter((content) => {
    if (content.body.includes(DEFAULT_PERMIT_BASE_URL) && content.user.type == UserType.Bot) {
      const url = new URL(content.body);
      // Check if the URL contains the specific query parameter
      return url.searchParams.has("claim");
    }
    return false;
  });
  if (permitComments.length > 0) {
    logger.info(`Skip to generate a permit url because it has been already posted.`);
    return `Permit generation disabled because it was already posted to this issue.`;
  }
  await deleteLabel(issueDetailed.priceLabel);
  await addLabelToIssue("Permitted");
  await savePermitToDB(assignee.id, txData);
  if (penaltyAmount.gt(0)) {
    await removePenalty(assignee.login, payload.repository.full_name, paymentToken, networkId.toString(), penaltyAmount);
  }
  return comment;
};
