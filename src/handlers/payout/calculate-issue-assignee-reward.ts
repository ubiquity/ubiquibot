import Decimal from "decimal.js";
import Runtime from "../../bindings/bot-runtime";
import { IncentivesCalculationResult } from "./incentives-calculation";
import { RewardsResponse } from "./handle-issue-closed";
import { removePenalty } from "./handle-issue-closed";
// Calculate the reward for the assignee
export async function calculateIssueAssigneeReward(
  incentivesCalculation: IncentivesCalculationResult
): Promise<RewardsResponse> {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const assigneeLogin = incentivesCalculation.assignee.login;
  const priceLabel = incentivesCalculation.taskPaymentMetaData.priceLabel;
  if (!priceLabel) {
    throw logger.warn(
      "Skipping to proceed the payment because there isn't a selected price label to calculate the assignee reward.",
      { incentivesCalculation }
    );
  }
  let taskAmount = new Decimal(priceLabel.substring(7, priceLabel.length - 4)).mul(incentivesCalculation.multiplier);
  if (taskAmount.gt(incentivesCalculation.permitMaxPrice)) {
    throw logger.warn("Skipping to proceed the payment because task payout is higher than `permitMaxPrice`.", {
      incentivesCalculation,
    });
  }

  // if contributor has any penalty then deduct it from the task

  const userId = incentivesCalculation.assignee.id;
  const amount = new Decimal(taskAmount);
  const comment = incentivesCalculation.comments[incentivesCalculation.comments.length - 1]; // not sure if this is the right comment, might need to generate a new comment
  const networkId = incentivesCalculation.evmNetworkId;
  const address = incentivesCalculation.paymentToken;

  await runtime.adapters.supabase.settlement.addDebit({ userId, amount, networkId, address });

  if (amount.gt(0)) {
    logger.info(`Deducting penalty from task`);
    const taskAmountAfterPenalty = taskAmount.sub(amount);
    if (taskAmountAfterPenalty.lte(0)) {
      // adds a settlement
      // adds credit
      await removePenalty({ userId: incentivesCalculation.assignee.id, amount, node: comment });
      throw logger.warn("Permit generation disabled because task amount after penalty is 0.");
    }
    taskAmount = new Decimal(taskAmountAfterPenalty);
  }

  const account = await runtime.adapters.supabase.wallet.getAddress(incentivesCalculation.assignee.id);

  return {
    title: "Issue-Assignee",
    userId: incentivesCalculation.assignee.id,
    username: assigneeLogin,
    reward: [
      {
        priceInDecimal: taskAmount,
        penaltyAmount: new Decimal(amount),
        account: account,
        userId: incentivesCalculation.assignee.id,
      },
    ],
  };
}
