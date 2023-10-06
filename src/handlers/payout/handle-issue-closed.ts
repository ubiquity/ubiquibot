import * as shims from "./shims";
import { getBotConfig, getLogger } from "../../bindings";
import {
  addLabelToIssue,
  deleteLabel,
  generatePermit2Signature,
  addCommentToIssue,
  createDetailsTable,
  savePermitToDB,
} from "../../helpers";
import Decimal from "decimal.js";
import { RewardsResponse } from "../comment";
import { IncentivesCalculationResult } from "./action";

interface HandleIssueClosed {
  creatorReward: RewardsResponse;
  assigneeReward: RewardsResponse;
  conversationRewards: RewardsResponse;
  pullRequestReviewersReward: RewardsResponse;
  incentivesCalculation: IncentivesCalculationResult;
}
interface RewardByUser {
  account: string;
  priceInBigNumber: Decimal;
  userId: number | undefined;
  issueId: string;
  type: (string | undefined)[];
  user: string | undefined;
  priceArray: string[];
  debug: Record<string, { count: number; reward: Decimal }> | undefined;
}
export async function handleIssueClosed({
  creatorReward,
  assigneeReward,
  conversationRewards,
  pullRequestReviewersReward,
  incentivesCalculation,
}: HandleIssueClosed): Promise<{ error: string }> {
  const logger = getLogger();
  const { comments } = getBotConfig();
  const issueNumber = incentivesCalculation.issue.number;

  let permitComment = "";
  const title = ["Issue-Assignee"];

  // Rewards by user
  const rewardByUser: RewardByUser[] = [];

  // ASSIGNEE REWARD PRICE PROCESSOR
  const priceInBigNumber = new Decimal(
    incentivesCalculation.issueDetailed.priceLabel.substring(
      7,
      incentivesCalculation.issueDetailed.priceLabel.length - 4
    )
  ).mul(incentivesCalculation.multiplier);

  if (priceInBigNumber.gt(incentivesCalculation.permitMaxPrice)) {
    throw logger.info("Skipping to proceed the payment because task payout is higher than permitMaxPrice");
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
      await shims.removePenalty({
        username: incentivesCalculation.assignee.login,
        repoName: incentivesCalculation.payload.repository.full_name,
        tokenAddress: incentivesCalculation.paymentToken,
        networkId: incentivesCalculation.evmNetworkId.toString(),
        penalty: assigneeReward.reward[0].penaltyAmount,
      });
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

    const { payoutUrl, txData } = await generatePermit2Signature(
      reward.account,
      reward.priceInBigNumber,
      reward.issueId,
      reward.userId?.toString()
    );

    const price = `${reward.priceInBigNumber} ${incentivesCalculation.tokenSymbol.toUpperCase()}`;

    const comment = createDetailsTable(price, payoutUrl, reward.user, detailsValue, reward.debug);

    await savePermitToDB(Number(reward.userId), txData);
    permitComment += comment;

    throw logger.info(
      `Skipping to generate a permit url for missing accounts. fallback: ${JSON.stringify(
        conversationRewards.fallbackReward
      )}`
    );
  }

  if (permitComment) await addCommentToIssue(permitComment.trim() + comments.promotionComment, issueNumber);

  await deleteLabel(incentivesCalculation.issueDetailed.priceLabel);
  await addLabelToIssue("Permitted");

  return { error: "" };
}
