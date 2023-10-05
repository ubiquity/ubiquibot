import { ethers } from "ethers";
import { getLogger } from "../../bindings";
import Decimal from "decimal.js";
import { getWalletAddress, RewardsResponse } from "../comment";
import { IncentivesCalculationResult } from "./incentives-calculation";

/**
 * Calculate the reward for the assignee
 */

export async function calculateIssueAssigneeReward(
  incentivesCalculation: IncentivesCalculationResult
): Promise<RewardsResponse> {
  const logger = getLogger();
  const assigneeLogin = incentivesCalculation.assignee.login;

  let priceInBigNumber = new Decimal(
    incentivesCalculation.issueDetailed.priceLabel.substring(
      7,
      incentivesCalculation.issueDetailed.priceLabel.length - 4
    )
  ).mul(incentivesCalculation.multiplier);
  if (priceInBigNumber.gt(incentivesCalculation.permitMaxPrice)) {
    throw logger.info("Skipping to proceed the payment because task payout is higher than permitMaxPrice.");
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
}
