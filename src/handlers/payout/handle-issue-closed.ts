import Decimal from "decimal.js";
import Runtime from "../../bindings/bot-runtime";
import {
  addCommentToIssue,
  createDetailsTable,
  deleteLabel,
  generatePermit2Signature,
  savePermitToDB,
} from "../../helpers";
import { IncentivesCalculationResult } from "./incentives-calculation";

interface HandleIssueClosed {
  creatorReward: RewardsResponse;
  assigneeReward: RewardsResponse;
  conversationRewards: RewardsResponse;
  pullRequestReviewersReward: RewardsResponse;
  incentivesCalculation: IncentivesCalculationResult;
}
interface RewardByUser {
  account: string;
  priceInDecimal: Decimal;
  userId?: number;
  issueId: string;
  type?: string[];
  user?: string;
  priceArray: string[];
  debug?: Record<string, { count: number; reward: Decimal }>;
}
export async function handleIssueClosed({
  creatorReward,
  assigneeReward,
  conversationRewards,
  pullRequestReviewersReward,
  incentivesCalculation,
}: HandleIssueClosed) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const { comments } = runtime.botConfig;
  const issueNumber = incentivesCalculation.issue.number;

  const title = ["Issue-Assignee"];

  // Rewards by user
  const rewardByUser: RewardByUser[] = [];

  // ASSIGNEE REWARD PRICE PROCESSOR
  const priceInDecimal = new Decimal(
    incentivesCalculation.issueDetailed.priceLabel.substring(
      7,
      incentivesCalculation.issueDetailed.priceLabel.length - 4
    )
  ).mul(incentivesCalculation.multiplier);

  if (priceInDecimal.gt(incentivesCalculation.permitMaxPrice)) {
    throw logger.info("Skipping to proceed the payment because task payout is higher than permitMaxPrice");
  }

  // COMMENTER REWARD HANDLER
  if (conversationRewards.reward && conversationRewards.reward.length > 0) {
    conversationRewards.reward.map(async (permit) => {
      // Exclude issue creator from commenter rewards
      if (permit.userId !== creatorReward.userId) {
        rewardByUser.push({
          account: permit.account,
          priceInDecimal: permit.priceInDecimal,
          userId: permit.userId,
          issueId: incentivesCalculation.issue.node_id,
          type: [conversationRewards.title],
          user: permit.user,
          priceArray: [permit.priceInDecimal.toString()],
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
          priceInDecimal: permit.priceInDecimal,
          userId: permit.userId,
          issueId: incentivesCalculation.issue.node_id,
          type: [pullRequestReviewersReward.title],
          user: permit.user,
          priceArray: [permit.priceInDecimal.toString()],
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
      priceInDecimal: creatorReward.reward[0].priceInDecimal,
      userId: creatorReward.userId,
      issueId: incentivesCalculation.issue.node_id,
      type: [creatorReward.title],
      user: creatorReward.username,
      priceArray: [creatorReward.reward[0].priceInDecimal.toString()],
      debug: creatorReward.reward[0].debug,
    });
  } else if (creatorReward && creatorReward.reward && creatorReward.reward[0].account === "0x") {
    throw logger.info(
      `Skipping to generate a permit url for missing account. fallback: ${creatorReward.fallbackReward}`
    );
  }

  // ASSIGNEE REWARD HANDLER
  if (assigneeReward && assigneeReward.reward && assigneeReward.reward[0].account !== "0x") {
    const permitComments = incentivesCalculation.comments.filter((content: { body: string }) => {
      const permitUrlMatches = content.body.match(incentivesCalculation.claimUrlRegex);
      if (!permitUrlMatches || permitUrlMatches.length < 2) return false;
      else return true;
    });

    rewardByUser.push({
      account: assigneeReward.reward[0].account,
      priceInDecimal: assigneeReward.reward[0].priceInDecimal,
      userId: assigneeReward.userId,
      issueId: incentivesCalculation.issue.node_id,
      type: title,
      user: assigneeReward.username,
      priceArray: [assigneeReward.reward[0].priceInDecimal.toString()],
      debug: assigneeReward.reward[0].debug,
    });

    if (permitComments.length > 0) {
      logger.info(`Skip to generate a permit url because it has been already posted.`);
      return { error: `Permit generation disabled because it was already posted to this issue.` };
    }

    if (assigneeReward.reward[0].penaltyAmount.gt(0)) {
      if (!assigneeReward.userId) throw new Error("assigneeReward.userId is undefined");
      await removePenalty({
        userId: assigneeReward.userId,
        amount: assigneeReward.reward[0].penaltyAmount,
        node: incentivesCalculation.comments[incentivesCalculation.comments.length - 1],

        // username: incentivesCalculation.assignee.login,
        // repoName: incentivesCalculation.payload.repository.full_name,
        // tokenAddress: incentivesCalculation.paymentToken,
        // networkId: incentivesCalculation.evmNetworkId,
        // penalty: assigneeReward.reward[0].penaltyAmount,
      });
    }
  }

  // MERGE ALL REWARDS
  const rewards = rewardByUser.reduce((account, current) => {
    const existing = account.find((item) => item.userId === current.userId);
    if (existing) {
      existing.priceInDecimal = existing.priceInDecimal.add(current.priceInDecimal);
      existing.priceArray = existing.priceArray.concat(current.priceArray);
      const currentType = current.type;
      existing.type = existing?.type?.concat(currentType || []);
    } else {
      account.push(current);
    }
    return account;
  }, [] as RewardByUser[]);

  // sort rewards by price
  rewards.sort((a, b) => new Decimal(b.priceInDecimal).cmp(new Decimal(a.priceInDecimal)));

  let permitComment;

  // CREATE PERMIT URL FOR EACH USER
  for (const reward of rewards) {
    if (!reward.user || !reward.userId) {
      logger.info("Skipping to generate a permit url for missing user. fallback: ", { reward });
      continue;
    }

    const detailsValue = reward.priceArray
      .map((price, i) => {
        if (reward.type) {
          const separateTitle = reward.type[i]?.split("-");
          if (!separateTitle) return { title: null, subtitle: null, value: null };
          return { title: separateTitle[0], subtitle: separateTitle[1], value: price };
        }
        return { title: null, subtitle: null, value: null };
      })
      // remove title if it's the same as the first one
      .map((item, i, arr) => {
        if (i === 0) return item;
        if (item.title === arr[0].title) return { ...item, title: null };
        return item;
      });

    const access = await Runtime.getState().adapters.supabase.access.getAccess(reward.userId);

    const multiplier = access?.multiplier || 1;
    const multiplierReason = access?.multiplier_reason || null;

    // if reason is not null, then add multiplier to detailsValue and multiply the price
    if (multiplierReason) {
      detailsValue.push({ title: "Multiplier", subtitle: "Amount", value: multiplier.toString() });
      detailsValue.push({ title: null, subtitle: "Reason", value: multiplierReason });

      // add multiplier to the price
      reward.priceInDecimal = priceInDecimal.mul(multiplier);
    }

    const { payoutUrl, permit } = await generatePermit2Signature(
      reward.account,
      reward.priceInDecimal,
      reward.issueId,
      reward.userId
    );

    const price = `${reward.priceInDecimal} ${incentivesCalculation.tokenSymbol.toUpperCase()}`;

    const filteredDetailsValue = detailsValue.filter(
      (item) => item.title !== null && item.subtitle !== null && item.value !== null
    );
    const comment = createDetailsTable(price, payoutUrl, reward.user, filteredDetailsValue, reward.debug);

    const org = incentivesCalculation.payload.organization;
    if (!org) {
      throw logger.error("org is undefined", incentivesCalculation.payload);
    }
    await savePermitToDB(Number(reward.userId), permit, incentivesCalculation.evmNetworkId, org);
    permitComment = comment;

    logger.warn("Skipping to generate a permit url for missing accounts.", conversationRewards.fallbackReward);
  }

  if (permitComment) await addCommentToIssue(permitComment.trim() + comments.promotionComment, issueNumber);

  await deleteLabel(incentivesCalculation.issueDetailed.priceLabel);
}

export interface RewardsResponse {
  title: string;
  userId: number;
  username: string;
  reward: {
    account: string;
    priceInDecimal: Decimal;
    penaltyAmount: Decimal;
    user?: string;
    userId: number;
    debug?: Record<string, { count: number; reward: Decimal }>;
  }[];
  fallbackReward?: Record<string, Decimal>;
}

//

//

import { Comment } from "../../types";
interface RemovePenalty {
  userId: number;
  amount: Decimal;
  node: Comment;
}

export async function removePenalty({ userId, amount, node }: RemovePenalty) {
  const { supabase } = Runtime.getState().adapters;

  await supabase.settlement.addCredit({
    userId: userId,
    amount: amount,
    comment: node,
  });
}
