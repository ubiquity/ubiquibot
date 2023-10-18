import Runtime from "../../bindings/bot-runtime";
import {
  checkUserPermissionForRepoAndOrg,
  clearAllPriceLabelsOnIssue,
  getAllIssueComments,
  getTokenSymbol,
  wasIssueReopened,
  getAllIssueAssignEvents,
} from "../../helpers";
import { UserType, Payload, StateReason, Comment, Incentives, Issue, User } from "../../types";
import { taskPaymentMetaData } from "../wildcard";
import { isParentIssue } from "../pricing";
import Decimal from "decimal.js";
import { getUserMultiplier } from "../comment/handlers/assign/get-user-multiplier";
import { removePenalty } from "./handle-issue-closed";

export interface IncentivesCalculationResult {
  id: number;
  paymentToken: string;
  rpc: string;
  evmNetworkId: number;
  privateKey: string;
  permitMaxPrice: number;
  priceMultiplier: number;
  incentives: Incentives;
  issueCreatorMultiplier: number;
  recipient: string;
  multiplier: number;
  issue: Issue;
  payload: Payload;
  comments: Comment[];
  taskPaymentMetaData: {
    isTask: boolean;
    timelabel: string | null;
    priorityLabel: string | null;
    priceLabel: string | null;
  };
  assignee: User;
  tokenSymbol: string;
  claimUrlRegex: RegExp;
}

export async function incentivesCalculation(): Promise<IncentivesCalculationResult> {
  const runtime = Runtime.getState();
  const payload = runtime.latestEventContext.payload as Payload;
  const issue = validateIssue(payload, runtime);

  if (runtime.botConfig.publicAccessControl.fundExternalClosedIssue) {
    await checkPermissionForExternalClosedIssue(payload, runtime);
  }

  const comments = await getAllIssueComments(issue.number);

  if (await shouldRemovePenalty(issue, comments, runtime)) {
    await removePenalty({
      // issue, comments, runtime
      userId: issue.assignee.id,
      amount: new Decimal(0),
      node: comments[comments.length - 1],
    });
  }

  validateIncentiveSettings(runtime);

  if (issue.state_reason !== StateReason.COMPLETED) {
    throw runtime.logger.warn("Permit generation disabled because this was not closed as completed.");
  }

  await handleParentIssueCheck(issue, runtime);

  await validateTaskEligibility(comments, issue, runtime);

  const assignee = getIssueAssignee(issue, runtime);
  const recipient = await getRecipientAddress(assignee, runtime);
  const userMultiplier = await getUserMultiplierValue(assignee, payload.repository.id, runtime);

  const tokenSymbol = await getTokenSymbol(runtime.botConfig.payout.paymentToken, runtime.botConfig.payout.rpc);

  return constructResultObject(issue, payload, comments, assignee, recipient, userMultiplier, tokenSymbol, runtime);
}

function validateIssue(payload: Payload, runtime: Runtime): Issue {
  const issue = payload.issue;
  if (!issue) {
    throw runtime.logger.warn("Permit generation skipped because issue is undefined");
  }
  return issue;
}

async function checkPermissionForExternalClosedIssue(payload: Payload, runtime: Runtime) {
  const userHasPermission = await checkUserPermissionForRepoAndOrg(payload.sender.login, runtime.latestEventContext);
  if (!userHasPermission) {
    throw runtime.logger.warn(
      "Permit generation disabled because this issue has been closed by an external contributor."
    );
  }
}

// async function shouldRemovePenalty(issue: Issue, comments: Comment[], runtime: Runtime): Promise<boolean> {
//   // Add your logic to decide if a penalty should be removed
//   return false;
// }

// async function removeIssuePenalty(issue: Issue, comments: Comment[], runtime: Runtime) {
//   // Add your logic to remove issue penalty
// }

function validateIncentiveSettings(runtime: Runtime) {
  if (!runtime.botConfig.mode.incentiveMode) {
    throw runtime.logger.warn("No incentive mode. Skipping to process.");
  }
  if (runtime.botConfig.payout.privateKey == null) {
    throw runtime.logger.warn(
      "Permit generation disabled because EVM wallet private key is not set. Let the maintainers know."
    );
  }
}

async function handleParentIssueCheck(issue: Issue, runtime: Runtime) {
  if (issue.body && isParentIssue(issue.body)) {
    await clearAllPriceLabelsOnIssue();
    throw runtime.logger.warn("Permit generation disabled because this is a collection of issues.");
  }
}

// function validateTaskEligibility(comments: Comment[], issue: Issue, runtime: Runtime) {
//   // Add your logic to validate task eligibility
// }

function getIssueAssignee(issue: Issue, runtime: Runtime): User {
  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    throw runtime.logger.warn("Skipping to proceed the payment because `assignee` is undefined");
  }
  return assignee;
}

async function getRecipientAddress(assignee: User, runtime: Runtime): Promise<string> {
  const recipient = await runtime.adapters.supabase.wallet.getAddress(assignee.id);
  if (!recipient) {
    throw runtime.logger.warn("Recipient address is missing");
  }
  return recipient;
}

async function getUserMultiplierValue(assignee: User, repositoryId: number, runtime: Runtime): Promise<number> {
  const userMultiplier = await getUserMultiplier(assignee.id, repositoryId);
  if (!userMultiplier) {
    throw runtime.logger.warn("User multiplier is missing");
  }
  const multiplier = userMultiplier.value;
  if (!multiplier) {
    throw runtime.logger.warn(
      "Refusing to generate the payment permit because the user's payment `multiplier` is set to `0`"
    );
  }
  return multiplier;
}

function constructResultObject(
  issue: Issue,
  payload: Payload,
  comments: Comment[],
  assignee: User,
  recipient: string,
  userMultiplier: number,
  tokenSymbol: string,
  runtime: Runtime
): IncentivesCalculationResult {
  return {
    id,
    paymentToken,
    rpc,
    evmNetworkId,
    privateKey,
    recipient,
    multiplier,
    permitMaxPrice,
    priceMultiplier,
    incentives,
    issueCreatorMultiplier,
    issue,
    payload,
    comments,
    issueDetailed: {
      isTask: issueDetailed.isTask,
      timelabel: issueDetailed.timeLabel,
      priorityLabel: issueDetailed.priorityLabel,
      priceLabel: issueDetailed.priceLabel,
    },
    assignee,
    tokenSymbol,
    claimUrlRegex,
  };
}
