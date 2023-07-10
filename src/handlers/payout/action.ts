import { BigNumber, ethers } from "ethers";
import { deductPenalty, getPenalty, getWalletAddress, getWalletMultiplier } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addLabelToIssue, deleteLabel, generatePermit2Signature, getAllIssueComments, getTokenSymbol } from "../../helpers";
import { Payload, StateReason } from "../../types";
import { shortenEthAddress } from "../../utils";
import { bountyInfo } from "../wildcard";

export const handleIssueClosed = async () => {
  const context = getBotContext();
  const {
    payout: { paymentToken, rpc, permitBaseUrl },
    mode: { autoPayMode },
  } = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  if (!issue) return;

  const comments = await getAllIssueComments(issue.number);
  const wasReopened = comments.some((comment) => comment.body.includes("reopened"));
  // if issue was reopened and now closed then remove penalty
  if (wasReopened) {
    logger.info("Permit generation skipped because the issue was reopened");

    const permitCommentIdx = comments.findIndex((e) => e.user.type === "Bot" && e.body.includes(permitBaseUrl));
    if (permitCommentIdx === -1) {
      logger.error(`Permit comment not found`);
      return;
    }

    const permitComment = comments[permitCommentIdx];
    const claimUrlRegex = new RegExp(`\((${permitBaseUrl}\S+)\)`);
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
    let claim;
    try {
      claim = JSON.parse(Buffer.from(claimBase64, "base64").toString("utf-8"));
    } catch (err: unknown) {
      logger.error(`${err}`);
      return;
    }
    const amount = BigNumber.from(claim.permit.permitted.amount);
    const tokenAddress = claim.permit.permitted.token;

    const assignmentComment = comments
      .slice(0, permitCommentIdx)
      .filter((e) => e.user.type === "Bot" && (e.body.includes("assigned") || e.body.includes("assign")))
      .reverse();
    if (assignmentComment.length === 0) {
      logger.error(`Assignment comment not found`);
      return;
    }

    // extract assignee
    const usernames = assignmentComment[0].body.match(/@\S+/g);
    if (!usernames || usernames.length < 2) {
      logger.error(`Assignee not found`);
      return;
    }
    const assignee = usernames[1].substring(1);

    const repoName = issue.repository_url.split("/").slice(-2)[0];

    try {
      await deductPenalty(assignee, repoName, tokenAddress, amount);
    } catch (err) {
      return;
    }

    logger.info(`Penalty deducted`);
    return;
  }

  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("Permit generation skipped because the issue was not closed as completed");
    return "Permit generation skipped because the issue was not closed as completed";
  }

  logger.info(`Handling issues.closed event, issue: ${issue.number}`);
  if (!autoPayMode) {
    logger.info(`Skipping to generate permit2 url, reason: { autoPayMode: ${autoPayMode}}`);
    return `Permit generation skipped since autoPayMode is disabled`;
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
  const multiplier = await getWalletMultiplier(assignee.login);

  if (multiplier === 0) {
    const errMsg = "Refusing to generate the payment permit because" + `@${assignee.login}` + "'s payment `multiplier` is `0`";
    logger.info(errMsg);
    return errMsg;
  }

  // TODO: add multiplier to the priceInEth
  let priceInEth = (+issueDetailed.priceLabel.substring(7, issueDetailed.priceLabel.length - 4) * multiplier).toString();
  if (!recipient || recipient?.trim() === "") {
    logger.info(`Recipient address is missing`);
    return (
      "Please set your wallet address by using the `/wallet` command.\n" +
      "```\n" +
      "/wallet example.eth\n" +
      "/wallet 0xBf...CdA\n" +
      "```\n" +
      "@" +
      assignee.login
    );
  }

  // if bounty hunter has any penalty then deduct it from the bounty
  const repoName = issue.repository_url.split("/").slice(-2)[0];
  const penaltyAmount = await getPenalty(assignee.login, repoName, paymentToken);
  if (penaltyAmount.gt(0)) {
    logger.info(`Deducting penalty from bounty`);
    const bountyAmount = ethers.utils.parseUnits(priceInEth, 18);
    const bountyAmountAfterPenalty = bountyAmount.sub(penaltyAmount);
    if (bountyAmountAfterPenalty.lte(0)) {
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
  const commentContents = comments.map((i) => i.body);
  const exist = commentContents.find((content) => content.includes(comment));
  if (exist) {
    logger.info(`Skip to generate a permit url because it has been already posted`);
    return `Permit generation skipped because it was already posted to this issue.`;
  }
  await deleteLabel(issueDetailed.priceLabel);
  await addLabelToIssue("Permitted");
  await deductPenalty(assignee, repoName, paymentToken, penaltyAmount);
  return comment;
};
