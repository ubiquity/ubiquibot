import { BigNumber, ethers } from "ethers";
// import { getLabelChanges, getPenalty, getWalletAddress, getUserMultiplier, removePenalty } from "../../adapters/supabase";
import * as shims from "./shims";
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
import { taskInfo } from "../wildcard";
import Decimal from "decimal.js";
import { GLOBAL_STRINGS } from "../../configs";
import { isParentIssue } from "../pricing";
import { getUserMultiplier, getWalletAddress, RewardsResponse } from "../comment";

export interface IncentivesCalculationResult {
  id: number;
  paymentToken: string;
  rpc: string;
  evmNetworkId: number;
  privateKey: string;
  permitMaxPrice: number;
  baseMultiplier: number;
  incentives: Incentives;
  issueCreatorMultiplier: number;
  recipient: string;
  multiplier: number;
  issue: Issue;
  payload: Payload;
  comments: Comment[];
  issueDetailed: {
    isTask: boolean;
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
  priceInBigNumber: Decimal;
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
    payout: { paymentToken, rpc, permitBaseUrl, evmNetworkId, privateKey },
    mode: { incentiveMode, permitMaxPrice },
    price: { incentives, issueCreatorMultiplier, baseMultiplier },
    publicAccessControl: accessControl,
  } = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const { repository, organization } = payload;

  const id = organization?.id || repository?.id; // repository?.id as fallback

  if (!issue) {
    throw new Error("Permit generation skipped because issue is undefined");
  }

  if (accessControl.fundExternalClosedIssue) {
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
    let evmNetworkId = url.searchParams.get("network");
    if (!evmNetworkId) {
      evmNetworkId = "1";
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
      await shims.removePenalty(assignee, payload.repository.full_name, tokenAddress, evmNetworkId, amount);
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

  if (permitMaxPrice == 0 || !permitMaxPrice) {
    logger.info(`Skipping to generate permit2 url, reason: { permitMaxPrice: ${permitMaxPrice}}`);
    throw new Error(`Permit generation disabled because permitMaxPrice is 0.`);
  }

  const issueDetailed = taskInfo(issue);
  if (!issueDetailed.isTask) {
    logger.info(`Skipping... its not a task`);
    throw new Error(`Permit generation disabled because this issue didn't qualify for funding.`);
  }

  if (!issueDetailed.priceLabel || !issueDetailed.priorityLabel || !issueDetailed.timelabel) {
    logger.info(`Skipping... its not a task`);
    throw new Error(`Permit generation disabled because this issue didn't qualify for funding.`);
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

  const { value: multiplier } = await getUserMultiplier(assignee.id);

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
    evmNetworkId,
    privateKey,
    recipient,
    multiplier,
    permitMaxPrice,
    baseMultiplier,
    incentives,
    issueCreatorMultiplier,
    issue,
    payload,
    comments,
    issueDetailed: {
      isTask: issueDetailed.isTask,
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

  let priceInBigNumber = new Decimal(
    incentivesCalculation.issueDetailed.priceLabel.substring(7, incentivesCalculation.issueDetailed.priceLabel.length - 4)
  ).mul(incentivesCalculation.multiplier);
  if (priceInBigNumber.gt(incentivesCalculation.permitMaxPrice)) {
    logger.info("Skipping to proceed the payment because task payout is higher than permitMaxPrice.");
    return { error: `Permit generation disabled because issue's task is higher than ${incentivesCalculation.permitMaxPrice}` };
  }

  // if contributor has any penalty then deduct it from the task
  const penaltyAmount = await getPenalty(
    assigneeLogin,
    incentivesCalculation.payload.repository.full_name,
    incentivesCalculation.paymentToken,
    incentivesCalculation.evmNetworkId.toString()
  );
  if (penaltyAmount.gt(0)) {
    logger.info(`Deducting penalty from task`);
    const taskAmount = ethers.utils.parseUnits(priceInBigNumber.toString(), 18);
    const taskAmountAfterPenalty = taskAmount.sub(penaltyAmount);
    if (taskAmountAfterPenalty.lte(0)) {
      await removePenalty(
        assigneeLogin,
        incentivesCalculation.payload.repository.full_name,
        incentivesCalculation.paymentToken,
        incentivesCalculation.evmNetworkId.toString(),
        taskAmount
      );
      const msg = `Permit generation disabled because task amount after penalty is 0.`;
      logger.info(msg);
      return { error: msg };
    }
    priceInBigNumber = new Decimal(ethers.utils.formatUnits(taskAmountAfterPenalty, 18));
  }

  const account = await getWalletAddress(incentivesCalculation.assignee.id);

  return {
    title: "Issue-Assignee",
    error: "",
    userId: incentivesCalculation.assignee.id,
    username: assigneeLogin,
    reward: [
      {
        priceInBigNumber,
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
  const priceInBigNumber = new Decimal(
    incentivesCalculation.issueDetailed.priceLabel.substring(7, incentivesCalculation.issueDetailed.priceLabel.length - 4)
  ).mul(incentivesCalculation.multiplier);

  if (priceInBigNumber.gt(incentivesCalculation.permitMaxPrice)) {
    logger.info("Skipping to proceed the payment because task payout is higher than permitMaxPrice");
    return { error: `Permit generation skipped since issue's task is higher than ${incentivesCalculation.permitMaxPrice}` };
  }

  // COMMENTER REWARD HANDLER
  if (conversationRewards.reward && conversationRewards.reward.length > 0) {
    conversationRewards.reward.map(async (permit) => {
      // Exclude issue creator from commenter rewards
      if (permit.userId !== creatorReward.userId) {
        rewardByUser.push({
          account: permit.account,
          priceInBigNumber: permit.priceInBigNumber,
          userId: permit.userId,
          issueId: incentivesCalculation.issue.node_id,
          type: [conversationRewards.title],
          user: permit.user,
          priceArray: [permit.priceInBigNumber.toString()],
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
          priceInBigNumber: permit.priceInBigNumber,
          userId: permit.userId,
          issueId: incentivesCalculation.issue.node_id,
          type: [pullRequestReviewersReward.title],
          user: permit.user,
          priceArray: [permit.priceInBigNumber.toString()],
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
      priceInBigNumber: creatorReward.reward[0].priceInBigNumber,
      userId: creatorReward.userId,
      issueId: incentivesCalculation.issue.node_id,
      type: [creatorReward.title],
      user: creatorReward.username,
      priceArray: [creatorReward.reward[0].priceInBigNumber.toString()],
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
      priceInBigNumber: assigneeReward.reward[0].priceInBigNumber,
      userId: assigneeReward.userId,
      issueId: incentivesCalculation.issue.node_id,
      type: title,
      user: assigneeReward.username,
      priceArray: [assigneeReward.reward[0].priceInBigNumber.toString()],
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
        incentivesCalculation.evmNetworkId.toString(),
        assigneeReward.reward[0].penaltyAmount
      );
    }
  }

  // MERGE ALL REWARDS
  const rewards = rewardByUser.reduce((acc, curr) => {
    const existing = acc.find((item) => item.userId === curr.userId);
    if (existing) {
      existing.priceInBigNumber = existing.priceInBigNumber.add(curr.priceInBigNumber);
      existing.priceArray = existing.priceArray.concat(curr.priceArray);
      existing.type = existing.type.concat(curr.type);
    } else {
      acc.push(curr);
    }
    return acc;
  }, [] as RewardByUser[]);

  // sort rewards by price
  rewards.sort((a, b) => {
    return new Decimal(b.priceInBigNumber).cmp(new Decimal(a.priceInBigNumber));
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
      const price = new Decimal(reward.priceInBigNumber);
      // add multiplier to the price
      reward.priceInBigNumber = price.mul(multiplier);
    }

    const { payoutUrl, txData } = await generatePermit2Signature(reward.account, reward.priceInBigNumber, reward.issueId, reward.userId?.toString());

    const price = `${reward.priceInBigNumber} ${incentivesCalculation.tokenSymbol.toUpperCase()}`;

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
