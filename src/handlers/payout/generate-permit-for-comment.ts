import { parseComments } from "../../helpers";
import { Incentives, User } from "../../types";
import Decimal from "decimal.js";
import { ItemsToExclude } from "./post";
import { calculateRewardValue } from "./calculate-reward-value";
import Runtime from "../../bindings/bot-runtime";

type GeneratePermitForComment = {
  user: User;
  comments: string[];
  multiplier: number;
  incentives: Incentives;
  permitMaxPrice: number;
};
export async function generatePermitForComment({
  user,
  comments,
  multiplier,
  incentives,
  permitMaxPrice,
}: GeneratePermitForComment) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const commentsByNode = parseComments(comments, ItemsToExclude);
  const rewardValue = calculateRewardValue(commentsByNode, incentives);
  if (rewardValue.equals(0)) {
    logger.info(
      `No reward for the user: ${user.login}. comments: ${JSON.stringify(commentsByNode)}, sum: ${rewardValue}`
    );
    return;
  }
  logger.debug("Reward value", { rewardValue: rewardValue.toString(), user: user.login, comments: commentsByNode });
  const account = await runtime.adapters.supabase.wallet.getAddress(user.id);
  const amountInBigNumber = rewardValue.mul(multiplier);
  if (amountInBigNumber.gt(permitMaxPrice)) {
    logger.info(
      `Skipping issue creator reward for user ${user.login} because reward is higher than payment permit max price`
    );
    return;
  }
  if (account) {
    return { account, amountInBigNumber };
  } else {
    return { account: "0x", amountInBigNumber: new Decimal(0) };
  }
}
