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
  addCommentToIssue,
} from "../../helpers";
import { UserType, Payload, StateReason, Comment, User, Incentives, Issue } from "../../types";
import { shortenEthAddress } from "../../utils";
import { bountyInfo } from "../wildcard";
import Decimal from "decimal.js";
import { GLOBAL_STRINGS } from "../../configs";
import { isParentIssue } from "../pricing";
import { RewardsResponse } from "../comment";
import { isEmpty } from "lodash";

export interface IncentivesCalculationResult {
  error: string;
  paymentToken?: string;
  rpc?: string;
  permitBaseUrl?: string;
  networkId?: number;
  privateKey?: string;
  paymentPermitMaxPrice?: number;
  baseMultiplier?: number;
  incentives?: Incentives;
  issueCreatorMultiplier?: number;
  recipient?: string;
  multiplier?: number;
  issue?: Issue;
  payload?: Payload;
  comments?: Comment[];
  issueDetailed?: {
    isBounty: boolean;
    timelabel: string | undefined;
    priorityLabel: string | undefined;
    priceLabel: string | undefined;
  };
  assignee?: User;
  tokenSymbol?: string;
}

/**
 * Function to check payment conditions
 */

export const incentivesCalculation = async (): Promise<IncentivesCalculationResult> => {
  const context = getBotContext();
  const {
    payout: { paymentToken, rpc, permitBaseUrl, networkId, privateKey },
    mode: { incentiveMode, paymentPermitMaxPrice },
    price: { incentives, issueCreatorMultiplier, baseMultiplier },
    accessControl,
  } = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const { repository, organization } = payload;

  const id = organization?.id || repository?.id; // repository?.id as fallback

  if (!issue) return { error: "Permit generation skipped because issue is undefined" };

  if (accessControl.organization) {
    const userHasPermission = await checkUserPermissionForRepoAndOrg(payload.sender.login, context);

    if (!userHasPermission) return { error: "Permit generation skipped because this issue has been closed by an external contributor." };
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
      return { error: "Permit generation skipped because permit URL not found" };
    }
    const url = new URL(permitUrl[1]);
    const claimBase64 = url.searchParams.get("claim");
    if (!claimBase64) {
      logger.error(`Permit claim search parameter not found`);
      return { error: "Permit generation skipped because permit claim search parameter not found" };
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
      return { error: "Permit generation skipped because permit claim is invalid" };
    }
    const amount = BigNumber.from(claim.permit.permitted.amount);
    const tokenAddress = claim.permit.permitted.token;

    // extract assignee
    const events = await getAllIssueAssignEvents(issue.number);
    if (events.length === 0) {
      logger.error(`No assignment found`);
      return { error: "Permit generation skipped because no assignment found" };
    }
    const assignee = events[0].assignee.login;

    try {
      await removePenalty(assignee, payload.repository.full_name, tokenAddress, networkId, amount);
    } catch (err) {
      logger.error(`Failed to remove penalty: ${err}`);
      return { error: "Permit generation skipped because failed to remove penalty" };
    }

    logger.info(`Penalty removed`);
    return { error: "Permit generation skipped, penalty removed" };
  }

  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    return { error: "No incentive mode. skipping to process" };
  }

  if (privateKey == "") {
    logger.info("Permit generation skipped because wallet private key is not set");
    return { error: "Permit generation skipped because wallet private key is not set" };
  }

  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("Permit generation skipped because this is marked as unplanned.");
    return { error: "Permit generation skipped because this is marked as unplanned." };
  }

  logger.info(`Checking if the issue is a parent issue.`);
  if (issue.body && isParentIssue(issue.body)) {
    logger.error("Permit generation skipped since the issue is identified as parent issue.");
    await clearAllPriceLabelsOnIssue();
    return { error: "Permit generation skipped since the issue is identified as parent issue." };
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
          return { error: `Permit generation skipped since automatic payment for this issue is disabled.` };
        }
        break;
      }
    }
  }

  if (paymentPermitMaxPrice == 0 || !paymentPermitMaxPrice) {
    logger.info(`Skipping to generate permit2 url, reason: { paymentPermitMaxPrice: ${paymentPermitMaxPrice}}`);
    return { error: `Permit generation skipped since paymentPermitMaxPrice is 0` };
  }

  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`Skipping... its not a bounty`);
    return { error: `Permit generation skipped since this issue didn't qualify as bounty` };
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping to proceed the payment because `assignee` is undefined");
    return { error: `Permit generation skipped since assignee is undefined` };
  }

  if (!issueDetailed.priceLabel) {
    logger.info("Skipping to proceed the payment because price not set");
    return { error: `Permit generation skipped since price label is not set` };
  }

  const recipient = await getWalletAddress(assignee.login);
  if (!recipient || recipient?.trim() === "") {
    logger.info(`Recipient address is missing`);
    return { error: `Permit generation skipped since recipient address is missing` };
  }

  const { value: multiplier } = await getWalletMultiplier(assignee.login, id?.toString());

  if (multiplier === 0) {
    const errMsg = "Refusing to generate the payment permit because " + `@${assignee.login}` + "'s payment `multiplier` is `0`";
    logger.info(errMsg);
    return { error: errMsg };
  }

  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);

  return {
    error: "",
    paymentToken,
    rpc,
    networkId,
    privateKey,
    recipient,
    multiplier,
    paymentPermitMaxPrice,
    baseMultiplier,
    incentives,
    issueCreatorMultiplier,
    issue,
    payload,
    comments,
    issueDetailed,
    assignee,
    tokenSymbol,
  };
};

/**
 * Calculate the reward for the assignee
 */

export const calculateIssueAssigneeReward = async (incentivesCalculation: IncentivesCalculationResult): Promise<RewardsResponse> => {
  const logger = getLogger();
  const assigneeLogin = incentivesCalculation.assignee!.login;

  let priceInEth = new Decimal(incentivesCalculation.issueDetailed!.priceLabel!.substring(7, incentivesCalculation.issueDetailed!.priceLabel!.length - 4)).mul(
    incentivesCalculation.multiplier!
  );
  if (priceInEth.gt(incentivesCalculation.paymentPermitMaxPrice!)) {
    logger.info("Skipping to proceed the payment because bounty payout is higher than paymentPermitMaxPrice");
    return { error: `Permit generation skipped since issue's bounty is higher than ${incentivesCalculation.paymentPermitMaxPrice}` };
  }

  // if bounty hunter has any penalty then deduct it from the bounty
  const penaltyAmount = await getPenalty(
    assigneeLogin,
    incentivesCalculation.payload!.repository.full_name,
    incentivesCalculation.paymentToken!,
    incentivesCalculation.networkId!.toString()
  );
  if (penaltyAmount.gt(0)) {
    logger.info(`Deducting penalty from bounty`);
    const bountyAmount = ethers.utils.parseUnits(priceInEth.toString(), 18);
    const bountyAmountAfterPenalty = bountyAmount.sub(penaltyAmount);
    if (bountyAmountAfterPenalty.lte(0)) {
      await removePenalty(
        assigneeLogin,
        incentivesCalculation.payload!.repository.full_name,
        incentivesCalculation.paymentToken!,
        incentivesCalculation.networkId!.toString(),
        bountyAmount
      );
      const msg = `Permit generation skipped because bounty amount after penalty is 0`;
      logger.info(msg);
      return { error: msg };
    }
    priceInEth = new Decimal(ethers.utils.formatUnits(bountyAmountAfterPenalty, 18));
  }

  const account = await getWalletAddress(assigneeLogin);

  return {
    error: "",
    user_id: incentivesCalculation.assignee!.node_id,
    username: assigneeLogin,
    reward: [
      {
        priceInEth,
        penaltyAmount,
        account: account || "0x",
      },
    ],
  };
};

export const handleIssueClosed = async (
  creatorReward: RewardsResponse,
  assigneeReward: RewardsResponse,
  conversationRewards: RewardsResponse,
  incentivesCalculation: IncentivesCalculationResult
): Promise<{ error: string }> => {
  const logger = getLogger();
  const { comments } = getBotConfig();
  const issueNumber = incentivesCalculation.issue!.number;

  let commentersComment = "",
    title = "Task Assignee",
    assigneeComment = "",
    creatorComment = "";
  // The mapping between gh handle and comment with a permit url
  const reward: Record<string, string> = {};

  // ASSIGNEE REWARD PRICE PROCESSOR
  let priceInEth = new Decimal(incentivesCalculation.issueDetailed!.priceLabel!.substring(7, incentivesCalculation.issueDetailed!.priceLabel!.length - 4)).mul(
    incentivesCalculation.multiplier!
  );
  if (priceInEth.gt(incentivesCalculation.paymentPermitMaxPrice!)) {
    logger.info("Skipping to proceed the payment because bounty payout is higher than paymentPermitMaxPrice");
    return { error: `Permit generation skipped since issue's bounty is higher than ${incentivesCalculation.paymentPermitMaxPrice}` };
  }

  // COMMENTERS REWARD HANDLER
  if (conversationRewards.reward && conversationRewards.reward.length > 0) {
    commentersComment = `#### ${conversationRewards.title}\n`;

    conversationRewards.reward.map(async (permit) => {
      // Exclude issue creator from commenter rewards
      if (permit.user_id !== creatorReward.user_id) {
        const { payoutUrl } = await generatePermit2Signature(permit.account!, permit.priceInEth, incentivesCalculation.issue!.node_id, permit.user_id);
        commentersComment = `${commentersComment}### [ **${permit.user}: [ CLAIM ${
          permit.priceInEth
        } ${incentivesCalculation.tokenSymbol!.toUpperCase()} ]** ](${payoutUrl})\n`;
        reward[permit.user!] = payoutUrl;
      }
    });

    logger.info(`Permit url generated for contributors. reward: ${JSON.stringify(reward)}`);
    logger.info(`Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(conversationRewards.fallbackReward)}`);
  }

  // CREATOR REWARD HANDLER
  // Generate permit for user if its not the same id as assignee
  if (creatorReward && creatorReward.reward && creatorReward.reward[0].account !== "0x" && creatorReward.user_id !== incentivesCalculation.assignee!.node_id) {
    const { payoutUrl } = await generatePermit2Signature(
      creatorReward.reward[0].account!,
      creatorReward.reward[0].priceInEth!,
      incentivesCalculation.issue!.node_id,
      creatorReward.user_id
    );

    creatorComment = `#### ${creatorReward.title}\n### [ **${creatorReward.username}: [ CLAIM ${creatorReward.reward[0]
      .priceInEth!} ${incentivesCalculation.tokenSymbol!.toUpperCase()} ]** ](${payoutUrl})\n`;
    if (payoutUrl) {
      logger.info(`Permit url generated for creator. reward: ${payoutUrl}`);
    }
    // Add amount to assignee if assignee is the creator
  } else if (
    creatorReward &&
    creatorReward.reward &&
    creatorReward.reward[0].account !== "0x" &&
    creatorReward.user_id === incentivesCalculation.assignee!.node_id
  ) {
    priceInEth = priceInEth.add(creatorReward.reward[0].priceInEth!);
    title += " and Creator";
  } else if (creatorReward && creatorReward.reward && creatorReward.reward[0].account === "0x") {
    logger.info(`Skipping to generate a permit url for missing account. fallback: ${creatorReward.fallbackReward}`);
  }

  // ASSIGNEE REWARD HANDLER
  if (assigneeReward && assigneeReward.reward && assigneeReward.reward[0].account! !== "0x") {
    const { txData, payoutUrl } = await generatePermit2Signature(
      assigneeReward.reward[0].account!,
      assigneeReward.reward[0].priceInEth!,
      incentivesCalculation.issue!.node_id,
      incentivesCalculation.assignee!.node_id
    );
    const tokenSymbol = await getTokenSymbol(incentivesCalculation.paymentToken!, incentivesCalculation.rpc!);
    const shortenRecipient = shortenEthAddress(assigneeReward.reward[0].account!, `[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]`.length);
    logger.info(`Posting a payout url to the issue, url: ${payoutUrl}`);
    assigneeComment =
      `#### ${title} Reward \n### [ **[ CLAIM ${priceInEth} ${tokenSymbol.toUpperCase()} ]** ](${payoutUrl})\n` + "```" + shortenRecipient + "```";
    const permitComments = incentivesCalculation.comments!.filter(
      (content) => content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
    );

    if (permitComments.length > 0) {
      logger.info(`Skip to generate a permit url because it has been already posted`);
      return { error: `Permit generation skipped because it was already posted to this issue.` };
    }

    if (assigneeReward.reward[0].penaltyAmount!.gt(0)) {
      await removePenalty(
        incentivesCalculation.assignee!.login,
        incentivesCalculation.payload!.repository.full_name,
        incentivesCalculation.paymentToken!,
        incentivesCalculation.networkId!.toString(),
        assigneeReward.reward[0].penaltyAmount!
      );
    }

    await savePermitToDB(incentivesCalculation.assignee!.id, txData);
  }

  if (commentersComment && !isEmpty(reward)) await addCommentToIssue(commentersComment, issueNumber);
  if (creatorComment) await addCommentToIssue(creatorComment, issueNumber);
  if (assigneeComment) await addCommentToIssue(assigneeComment + comments.promotionComment, issueNumber);

  await deleteLabel(incentivesCalculation.issueDetailed!.priceLabel!);
  await addLabelToIssue("Permitted");

  return { error: "" };
};
