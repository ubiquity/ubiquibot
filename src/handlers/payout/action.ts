import { BigNumber, ethers } from "ethers";
import { getLabelChanges, getPenalty, getWalletAddress, getWalletMultiplier, removePenalty } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import {
  addLabelToIssue,
  checkUserPermissionForRepoAndOrg,
  clearAllPriceLabelsOnIssue,
  deleteLabel,
  generatePermit2Signature,
  getAllIssueComments,
  getTokenSymbol,
  wasIssueReopened,
  getAllIssueAssignEvents,
  addCommentToIssue,
  createDetailsTable,
  savePermitToDB,
} from "../../helpers";
import { UserType, Payload, StateReason, Comment, User, Incentives, Issue } from "../../types";
import { bountyInfo } from "../wildcard";
import Decimal from "decimal.js";
import { GLOBAL_STRINGS } from "../../configs";
import { isParentIssue } from "../pricing";
import { RewardsResponse } from "../comment";

export interface IncentivesCalculationResult {
  id: number;
  paymentToken: string;
  rpc: string;
  networkId: number;
  privateKey: string;
  paymentPermitMaxPrice: number;
  baseMultiplier: number;
  incentives: Incentives;
  issueCreatorMultiplier: number;
  recipient: string;
  multiplier: number;
  issue: Issue;
  payload: Payload;
  comments: Comment[];
  issueDetailed: {
    isBounty: boolean;
    timelabel: string;
    priorityLabel: string;
    priceLabel: string;
  };
  assignee: User;
  tokenSymbol: string;
  claimUrlRegex: RegExp;
}

export interface RewardByUser {
  account: string;
  priceInEth: Decimal;
  userId: number | undefined;
  issueId: string;
  type: (string | undefined)[];
  user: string | undefined;
  priceArray: string[];
  debug: Record<string, { count: number; reward: Decimal }>;
}

/**
 * Collect the information required for the permit generation and error handling
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

  if (!issue) {
    throw new Error("Permit generation skipped because issue is undefined");
  }

  if (accessControl.organization) {
    const userHasPermission = await checkUserPermissionForRepoAndOrg(payload.sender.login, context);

    if (!userHasPermission) {
      throw new Error("Permit generation disabled because this issue has been closed by an external contributor.");
    }
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
      throw new Error("Permit generation skipped because permit URL not found");
    }
    const url = new URL(permitUrl[1]);
    const claimBase64 = url.searchParams.get("claim");
    if (!claimBase64) {
      logger.error(`Permit claim search parameter not found`);
      throw new Error("Permit generation skipped because permit claim search parameter not found");
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
      throw new Error("Permit generation skipped because permit claim is invalid");
    }
    const amount = BigNumber.from(claim.permit.permitted.amount);
    const tokenAddress = claim.permit.permitted.token;

    // extract assignee
    const events = await getAllIssueAssignEvents(issue.number);
    if (events.length === 0) {
      logger.error(`No assignment found`);
      throw new Error("Permit generation skipped because no assignment found");
    }
    const assignee = events[0].assignee.login;

    try {
      await removePenalty(assignee, payload.repository.full_name, tokenAddress, networkId, amount);
    } catch (err) {
      logger.error(`Failed to remove penalty: ${err}`);
      throw new Error("Permit generation skipped because failed to remove penalty");
    }

    logger.info(`Penalty removed`);
    throw new Error("Permit generation skipped, penalty removed");
  }

  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    throw new Error("No incentive mode. skipping to process");
  }

  if (privateKey == "") {
    logger.info("Permit generation disabled because wallet private key is not set.");
    throw new Error("Permit generation disabled because wallet private key is not set.");
  }

  if (issue.state_reason !== StateReason.COMPLETED) {
    logger.info("Permit generation disabled because this is marked as unplanned.");
    throw new Error("Permit generation disabled because this is marked as unplanned.");
  }

  logger.info(`Checking if the issue is a parent issue.`);
  if (issue.body && isParentIssue(issue.body)) {
    logger.error("Permit generation disabled because this is a collection of issues.");
    await clearAllPriceLabelsOnIssue();
    throw new Error("Permit generation disabled because this is a collection of issues.");
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
          throw new Error(`Permit generation disabled because automatic payment for this issue is disabled.`);
        }
        break;
      }
    }
  }

  if (paymentPermitMaxPrice == 0 || !paymentPermitMaxPrice) {
    logger.info(`Skipping to generate permit2 url, reason: { paymentPermitMaxPrice: ${paymentPermitMaxPrice}}`);
    throw new Error(`Permit generation disabled because paymentPermitMaxPrice is 0.`);
  }

  const issueDetailed = bountyInfo(issue);
  if (!issueDetailed.isBounty) {
    logger.info(`Skipping... its not a bounty`);
    throw new Error(`Permit generation disabled because this issue didn't qualify as bounty.`);
  }

  if (!issueDetailed.priceLabel || !issueDetailed.priorityLabel || !issueDetailed.timelabel) {
    logger.info(`Skipping... its not a bounty`);
    throw new Error(`Permit generation disabled because this issue didn't qualify as bounty.`);
  }

  // check for label altering here
  const labelChanges = await getLabelChanges(repository.full_name, [issueDetailed.priceLabel, issueDetailed.priorityLabel, issueDetailed.timelabel]);

  if (labelChanges) {
    // if approved is still false, it means user was certainly not authorized for that edit
    if (!labelChanges.approved) {
      logger.info(`Skipping... label was changed by unauthorized user`);
      throw new Error(`Permit generation disabled because label: "${labelChanges.label_to}" was modified by an unauthorized user`);
    }
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("Skipping to proceed the payment because `assignee` is undefined");
    throw new Error(`Permit generation disabled because assignee is undefined.`);
  }

  if (!issueDetailed.priceLabel) {
    logger.info("Skipping to proceed the payment because price not set");
    throw new Error(`Permit generation disabled because price label is not set.`);
  }

  const recipient = await getWalletAddress(assignee.login);
  if (!recipient || recipient?.trim() === "") {
    logger.info(`Recipient address is missing`);
    throw new Error(`Permit generation skipped because recipient address is missing`);
  }

  const { value: multiplier } = await getWalletMultiplier(assignee.login, id?.toString());

  if (multiplier === 0) {
    const errMsg = "Refusing to generate the payment permit because " + `@${assignee.login}` + "'s payment `multiplier` is `0`";
    logger.info(errMsg);
    throw new Error(errMsg);
  }

  const permitComments = comments.filter((content) => content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot);

  if (permitComments.length > 0) {
    logger.info(`skip to generate a permit url because it has been already posted`);
    throw new Error(`skip to generate a permit url because it has been already posted`);
  }

  const tokenSymbol = await getTokenSymbol(paymentToken, rpc);

  return {
    id,
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
    issueDetailed: {
      isBounty: issueDetailed.isBounty,
      timelabel: issueDetailed.timelabel,
      priorityLabel: issueDetailed.priorityLabel,
      priceLabel: issueDetailed.priceLabel,
    },
    assignee,
    tokenSymbol,
    claimUrlRegex,
  };
};

/**
 * Calculate the reward for the assignee
 */

export const calculateIssueAssigneeReward = async (incentivesCalculation: IncentivesCalculationResult): Promise<RewardsResponse> => {
  const logger = getLogger();
  const assigneeLogin = incentivesCalculation.assignee.login;

  let priceInEth = new Decimal(incentivesCalculation.issueDetailed.priceLabel.substring(7, incentivesCalculation.issueDetailed.priceLabel.length - 4)).mul(
    incentivesCalculation.multiplier
  );
  if (priceInEth.gt(incentivesCalculation.paymentPermitMaxPrice)) {
    logger.info("Skipping to proceed the payment because bounty payout is higher than paymentPermitMaxPrice.");
    return { error: `Permit generation disabled because issue's bounty is higher than ${incentivesCalculation.paymentPermitMaxPrice}` };
  }

  // if bounty hunter has any penalty then deduct it from the bounty
  const penaltyAmount = await getPenalty(
    assigneeLogin,
    incentivesCalculation.payload.repository.full_name,
    incentivesCalculation.paymentToken,
    incentivesCalculation.networkId.toString()
  );
  if (penaltyAmount.gt(0)) {
    logger.info(`Deducting penalty from bounty`);
    const bountyAmount = ethers.utils.parseUnits(priceInEth.toString(), 18);
    const bountyAmountAfterPenalty = bountyAmount.sub(penaltyAmount);
    if (bountyAmountAfterPenalty.lte(0)) {
      await removePenalty(
        assigneeLogin,
        incentivesCalculation.payload.repository.full_name,
        incentivesCalculation.paymentToken,
        incentivesCalculation.networkId.toString(),
        bountyAmount
      );
      const msg = `Permit generation disabled because bounty amount after penalty is 0.`;
      logger.info(msg);
      return { error: msg };
    }
    priceInEth = new Decimal(ethers.utils.formatUnits(bountyAmountAfterPenalty, 18));
  }

  const account = await getWalletAddress(assigneeLogin);

  return {
    title: "Issue-Assignee",
    error: "",
    userId: incentivesCalculation.assignee.id,
    username: assigneeLogin,
    reward: [
      {
        priceInEth,
        penaltyAmount,
        account: account || "0x",
        user: "",
        userId: incentivesCalculation.assignee.id,
        debug: {},
      },
    ],
  };
};

export const handleIssueClosed = async (
  creatorReward: RewardsResponse,
  assigneeReward: RewardsResponse,
  conversationRewards: RewardsResponse,
  pullRequestReviewersReward: RewardsResponse,
  incentivesCalculation: IncentivesCalculationResult
): Promise<{ error: string }> => {
  const logger = getLogger();
  const { comments } = getBotConfig();
  const issueNumber = incentivesCalculation.issue.number;

  let permitComment = "";
  const title = ["Issue-Assignee"];

  // Rewards by user
  const rewardByUser: RewardByUser[] = [];

  // ASSIGNEE REWARD PRICE PROCESSOR
  const priceInEth = new Decimal(incentivesCalculation.issueDetailed.priceLabel.substring(7, incentivesCalculation.issueDetailed.priceLabel.length - 4)).mul(
    incentivesCalculation.multiplier
  );

  if (priceInEth.gt(incentivesCalculation.paymentPermitMaxPrice)) {
    logger.info("Skipping to proceed the payment because bounty payout is higher than paymentPermitMaxPrice");
    return { error: `Permit generation skipped since issue's bounty is higher than ${incentivesCalculation.paymentPermitMaxPrice}` };
  }

  // COMMENTERS REWARD HANDLER
  if (conversationRewards.reward && conversationRewards.reward.length > 0) {
    conversationRewards.reward.map(async (permit) => {
      // Exclude issue creator from commenter rewards
      if (permit.userId !== creatorReward.userId) {
        rewardByUser.push({
          account: permit.account,
          priceInEth: permit.priceInEth,
          userId: permit.userId,
          issueId: incentivesCalculation.issue.node_id,
          type: [conversationRewards.title],
          user: permit.user,
          priceArray: [permit.priceInEth.toString()],
          debug: permit.debug,
        });
      }
    });
  }

  // PULL REQUEST REVIEWERS REWARD HANDLER
  if (pullRequestReviewersReward.reward && pullRequestReviewersReward.reward.length > 0) {
    pullRequestReviewersReward.reward.map(async (permit) => {
      // Exclude issue creator from commenter rewards
      if (permit.userId !== creatorReward.userId) {
        rewardByUser.push({
          account: permit.account,
          priceInEth: permit.priceInEth,
          userId: permit.userId,
          issueId: incentivesCalculation.issue.node_id,
          type: [pullRequestReviewersReward.title],
          user: permit.user,
          priceArray: [permit.priceInEth.toString()],
          debug: permit.debug,
        });
      }
    });
  }

  // CREATOR REWARD HANDLER
  // Generate permit for user if its not the same id as assignee
  if (creatorReward && creatorReward.reward && creatorReward.reward[0].account !== "0x") {
    rewardByUser.push({
      account: creatorReward.reward[0].account,
      priceInEth: creatorReward.reward[0].priceInEth,
      userId: creatorReward.userId,
      issueId: incentivesCalculation.issue.node_id,
      type: [creatorReward.title],
      user: creatorReward.username,
      priceArray: [creatorReward.reward[0].priceInEth.toString()],
      debug: creatorReward.reward[0].debug,
    });
  } else if (creatorReward && creatorReward.reward && creatorReward.reward[0].account === "0x") {
    logger.info(`Skipping to generate a permit url for missing account. fallback: ${creatorReward.fallbackReward}`);
  }

  // ASSIGNEE REWARD HANDLER
  if (assigneeReward && assigneeReward.reward && assigneeReward.reward[0].account !== "0x") {
    const permitComments = incentivesCalculation.comments.filter((content) => {
      const permitUrlMatches = content.body.match(incentivesCalculation.claimUrlRegex);
      if (!permitUrlMatches || permitUrlMatches.length < 2) return false;
      else return true;
    });

    rewardByUser.push({
      account: assigneeReward.reward[0].account,
      priceInEth: assigneeReward.reward[0].priceInEth,
      userId: assigneeReward.userId,
      issueId: incentivesCalculation.issue.node_id,
      type: title,
      user: assigneeReward.username,
      priceArray: [assigneeReward.reward[0].priceInEth.toString()],
      debug: assigneeReward.reward[0].debug,
    });

    if (permitComments.length > 0) {
      logger.info(`Skip to generate a permit url because it has been already posted.`);
      return { error: `Permit generation disabled because it was already posted to this issue.` };
    }

    if (assigneeReward.reward[0].penaltyAmount.gt(0)) {
      await removePenalty(
        incentivesCalculation.assignee.login,
        incentivesCalculation.payload.repository.full_name,
        incentivesCalculation.paymentToken,
        incentivesCalculation.networkId.toString(),
        assigneeReward.reward[0].penaltyAmount
      );
    }
    
    await savePermitToDB(txData);
  }

  // MERGE ALL REWARDS
  const rewards = rewardByUser.reduce((acc, curr) => {
    const existing = acc.find((item) => item.userId === curr.userId);
    if (existing) {
      existing.priceInEth = existing.priceInEth.add(curr.priceInEth);
      existing.priceArray = existing.priceArray.concat(curr.priceArray);
      existing.type = existing.type.concat(curr.type);
    } else {
      acc.push(curr);
    }
    return acc;
  }, [] as RewardByUser[]);

  // sort rewards by price
  rewards.sort((a, b) => {
    return new Decimal(b.priceInEth).cmp(new Decimal(a.priceInEth));
  });

  // CREATE PERMIT URL FOR EACH USER
  for (const reward of rewards) {
    if (!reward.user || !reward.userId) {
      logger.info(`Skipping to generate a permit url for missing user. fallback: ${reward.user}`);
      continue;
    }

    const detailsValue = reward.priceArray
      .map((price, i) => {
        const separateTitle = reward.type[i]?.split("-");
        if (!separateTitle) return { title: "", subtitle: "", value: "" };
        return { title: separateTitle[0], subtitle: separateTitle[1], value: price };
      })
      // remove title if it's the same as the first one
      .map((item, i, arr) => {
        if (i === 0) return item;
        if (item.title === arr[0].title) return { ...item, title: "" };
        return item;
      });

    const { reason, value } = await getWalletMultiplier(reward.user, incentivesCalculation.id?.toString());

    // if reason is not "", then add multiplier to detailsValue and multiply the price
    if (reason) {
      detailsValue.push({ title: "Multiplier", subtitle: "Amount", value: value.toString() });
      detailsValue.push({ title: "", subtitle: "Reason", value: reason });

      const multiplier = new Decimal(value);
      const price = new Decimal(reward.priceInEth);
      // add multiplier to the price
      reward.priceInEth = price.mul(multiplier);
    }

    const { payoutUrl, txData } = await generatePermit2Signature(reward.account, reward.priceInEth, reward.issueId, reward.userId?.toString());

    const price = `${reward.priceInEth} ${incentivesCalculation.tokenSymbol.toUpperCase()}`;

    const comment = createDetailsTable(price, payoutUrl, reward.user, detailsValue, reward.debug);

    await savePermitToDB(Number(reward.userId), txData);
    permitComment += comment;

    logger.info(`Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(conversationRewards.fallbackReward)}`);
    logger.info(`Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(pullRequestReviewersReward.fallbackReward)}`);
  }

  if (permitComment) await addCommentToIssue(permitComment.trim() + comments.promotionComment, issueNumber);

  await deleteLabel(incentivesCalculation.issueDetailed.priceLabel);
  await addLabelToIssue("Permitted");

  return { error: "" };
};
