import { getLogger } from "../../bindings";
import { getAllIssueComments, getIssueDescription } from "../../helpers";
import { UserType } from "../../types";
import { RewardsResponse } from "../comment";
import Decimal from "decimal.js";
import { taskInfo } from "../wildcard";
import { IncentivesCalculationResult } from "./action";
import { BigNumber } from "ethers";
import { generatePermitForComment } from "./generate-permit-for-comment";

export async function calculateIssueCreatorReward(incentivesCalculation: IncentivesCalculationResult): Promise<RewardsResponse> {
  const title = `Task Creator`;
  const logger = getLogger();

  const issueDetailed = taskInfo(incentivesCalculation.issue);
  if (!issueDetailed.isTask) {
    logger.info(`incentivizeCreatorComment: its not a funded task`);
    return { error: `incentivizeCreatorComment: its not a funded task` };
  }

  const comments = await getAllIssueComments(incentivesCalculation.issue.number);
  const permitComments = comments.filter(
    (content) => content.body.includes(title) && content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
  );
  if (permitComments.length > 0) {
    logger.info(`incentivizeCreatorComment: skip to generate a permit url because it has been already posted`);
    return { error: `incentivizeCreatorComment: skip to generate a permit url because it has been already posted` };
  }

  const assignees = incentivesCalculation.issue.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    logger.info("incentivizeCreatorComment: skipping payment permit generation because `assignee` is `undefined`.");
    return { error: "incentivizeCreatorComment: skipping payment permit generation because `assignee` is `undefined`." };
  }

  const description = await getIssueDescription(incentivesCalculation.issue.number, "html");
  if (!description) {
    logger.info(`Skipping to generate a permit url because issue description is empty. description: ${description}`);
    return { error: `Skipping to generate a permit url because issue description is empty. description: ${description}` };
  }
  logger.info(`Getting the issue description done. description: ${description}`);
  const creator = incentivesCalculation.issue.user;
  if (creator.type === UserType.Bot || creator.login === incentivesCalculation.issue.assignee) {
    logger.info("Issue creator assigned himself or Bot created this issue.");
    return { error: "Issue creator assigned their self or bot created this issue." };
  }

  const result = await generatePermitForComment(
    creator,
    [description],
    incentivesCalculation.issueCreatorMultiplier,
    incentivesCalculation.incentives,
    incentivesCalculation.permitMaxPrice
  );

  if (!result || !result.account || !result.amountInBigNumber) {
    throw new Error("Failed to generate permit for issue creator because of missing account or amountInBigNumber");
  }

  return {
    error: "",
    title,
    userId: creator.node_id,
    username: creator.login,
    reward: [
      {
        priceInBigNumber: result?.amountInBigNumber ?? new Decimal(0),
        account: result?.account,
        userId: "",
        user: "",
        penaltyAmount: BigNumber.from(0),
      },
    ],
  };
}
