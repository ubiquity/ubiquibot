import { Comment, Issue, Organization, Payload, UserCommands } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { assign } from "./assign";
import { listAvailableCommands } from "./help";
// Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
// import { payout } from "./payout";
import { BigNumber, ethers } from "ethers";
import { setLabels } from "./labels";
import { ask } from "./ask";
import { approveLabelChange } from "./authorize";
import { multiplier } from "./multiplier";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
// import { addPenalty } from "../../../adapters/supabase";
import Runtime from "../../../bindings/bot-runtime";
import {
  addCommentToIssue,
  addLabelToIssue,
  calculateWeight,
  createLabel,
  getAllIssueAssignEvents,
  getAllIssueComments,
  getLabel,
  getPayoutConfigByNetworkId,
  getTokenSymbol,
  upsertCommentToIssue,
} from "../../../helpers";

import Decimal from "decimal.js";
import { ErrorDiff } from "../../../utils/helpers";
import { calculateIssueAssigneeReward } from "../../payout/calculate-issue-assignee-reward";
import { calculateIssueConversationReward } from "../../payout/calculate-issue-conversation-reward";
import { calculateIssueCreatorReward } from "../../payout/calculate-issue-creator-reward";
import { calculateReviewContributorRewards } from "../../payout/calculate-review-contributor-rewards";
import { handleIssueClosed } from "../../payout/handle-issue-closed";
import { incentivesCalculation } from "../../payout/incentives-calculation";
import { getTargetPriceLabel } from "../../shared";
import { autoPay } from "./payout";
import { query } from "./query";

export * from "./ask";
export * from "./assign";
export * from "./authorize";
export * from "./help";
export * from "./multiplier";
export * from "./payout";
export * from "./query";
export * from "./unassign";
export * from "./wallet";

export interface RewardsResponse {
  error: string | null;
  title?: string;
  userId?: number;
  username?: string;
  reward?: {
    account: string;
    priceInDecimal: Decimal;
    penaltyAmount: Decimal;
    user: string | undefined;
    userId: number;
    debug?: Record<string, { count: number; reward: Decimal }>;
  }[];
  fallbackReward?: Record<string, Decimal>;
}

// Parses the comment body and figure out the command name a user wants
export function commentParser(body: string): IssueCommentCommands[] {
  const regex = /^\/(\w+)\b/; // Regex pattern to match the command at the beginning of the body

  const matches = regex.exec(body);
  if (matches) {
    const command = matches[0] as IssueCommentCommands;
    if (Object.values(IssueCommentCommands).includes(command)) {
      return [command];
    }
  }

  return [];
}

// Callback for issues closed - Processor
export async function issueClosedCallback(): Promise<void> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;
  const issue = payload.issue;
  const organization = payload.organization as Organization;

  const logger = runtime.logger;

  if (!organization) throw logger.error("Cannot save permit to DB, missing organization");
  if (!issue) throw logger.error("Cannot save permit to DB, missing issue");
  try {
    // assign function incentivesCalculation to a variable
    const calculateIncentives = await incentivesCalculation();

    const creatorReward = await calculateIssueCreatorReward(calculateIncentives);
    const assigneeReward = await calculateIssueAssigneeReward(calculateIncentives);
    const conversationRewards = await calculateIssueConversationReward(calculateIncentives);
    const pullRequestReviewersReward = await calculateReviewContributorRewards(calculateIncentives);

    const { error } = await handleIssueClosed({
      creatorReward,
      assigneeReward,
      conversationRewards,
      pullRequestReviewersReward,
      incentivesCalculation: calculateIncentives,
      organization: organization,
    });

    if (error) {
      throw new Error(error);
    }
  } catch (err) {
    return await _renderErrorDiffWrapper(err, issue);
  }
}

export async function _renderErrorDiffWrapper(err: unknown, issue: Issue) {
  let commentBody;
  if (err instanceof Error) {
    console.trace(err);
    commentBody = `${err.message}${err.stack}`;
  } else {
    console.trace(err);
    commentBody = JSON.stringify(err);
  }
  return await addCommentToIssue(ErrorDiff(commentBody), issue.number);
}

export async function issueCreatedCallback(): Promise<void> {
  // Callback for issues created - Processor
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const { payload: _payload } = runtime.eventContext;
  const config = Runtime.getState().botConfig;
  const issue = (_payload as Payload).issue;
  if (!issue) return;
  const labels = issue.labels;

  const { assistivePricing } = config.mode;

  if (!assistivePricing) {
    logger.info("Skipping adding label to issue because assistive pricing is disabled.");
    return;
  }

  try {
    const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
    const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

    const minTimeLabel =
      timeLabels.length > 0
        ? timeLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name
        : config.price.defaultLabels[0];
    const minPriorityLabel =
      priorityLabels.length > 0
        ? priorityLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name
        : config.price.defaultLabels[1];
    if (!timeLabels.length) await addLabelToIssue(minTimeLabel);
    if (!priorityLabels.length) await addLabelToIssue(minPriorityLabel);

    const targetPriceLabel = getTargetPriceLabel(minTimeLabel, minPriorityLabel);
    if (targetPriceLabel && !labels.map((i) => i.name).includes(targetPriceLabel)) {
      const exist = await getLabel(targetPriceLabel);
      if (!exist) await createLabel(targetPriceLabel, "price");
      await addLabelToIssue(targetPriceLabel);
    }
  } catch (err) {
    return await _renderErrorDiffWrapper(err, issue);
  }
}

export async function issueReopenedCallback(): Promise<void> {
  // Callback for issues reopened - Processor
  const runtime = Runtime.getState();
  const { payload: _payload } = runtime.eventContext;
  const {
    payout: { permitBaseUrl },
  } = Runtime.getState().botConfig;
  const logger = runtime.logger;
  const issue = (_payload as Payload).issue;
  // const repository = (_payload as Payload).repository;
  if (!issue) return;
  try {
    // find permit comment from the bot
    const comments = await getAllIssueComments(issue.number);
    const claimUrlRegex = new RegExp(`\\((${permitBaseUrl}\\?claim=\\S+)\\)`);
    const permitCommentIdx = comments.findIndex((e) => e.user.type === "Bot" && e.body.match(claimUrlRegex));
    if (permitCommentIdx === -1) {
      return;
    }

    // extract permit amount and token
    const permitComment = comments[permitCommentIdx];
    const permitUrl = permitComment.body.match(claimUrlRegex);
    if (!permitUrl || permitUrl.length < 2) {
      logger.error(`Permit URL not found`);
      return;
    }
    const url = new URL(permitUrl[1]);
    const claimBase64 = url.searchParams.get("claim");
    if (!claimBase64) {
      logger.error(`Permit claim search parameter not found`);
      return;
    }
    let networkId = url.searchParams.get("network");
    if (!networkId) {
      networkId = "1";
    }
    const { rpc } = getPayoutConfigByNetworkId(Number(networkId));
    let claim;
    try {
      claim = JSON.parse(Buffer.from(claimBase64, "base64").toString("utf-8"));
    } catch (err: unknown) {
      logger.error(`Error parsing claim: ${err}`);
      return;
    }
    const amount = BigNumber.from(claim.permit.permitted.amount);
    const formattedAmount = ethers.utils.formatUnits(amount, 18);
    const tokenAddress = claim.permit.permitted.token;
    const tokenSymbol = await getTokenSymbol(tokenAddress, rpc);

    // find latest assignment before the permit comment
    const events = await getAllIssueAssignEvents(issue.number);
    if (events.length === 0) {
      logger.error(`No assignment found`);
      return;
    }
    const assignee = events[0].assignee.login;

    if (parseFloat(formattedAmount) > 0) {
      // write penalty to db
      const { debit } = Runtime.getState().adapters.supabase;

      try {
        await debit.addDebit({
          userId: events[0].assignee.id,
          amount: new Decimal(formattedAmount),
          // comment: permitComment,
          networkId: Number(networkId),
          address: tokenAddress,
        });
      } catch (err) {
        logger.error(`Error writing penalty to db: ${err}`);
        return;
      }

      await addCommentToIssue(
        `@${assignee} please be sure to review this conversation and implement any necessary fixes. Unless this is closed as completed, its payment of **${formattedAmount} ${tokenSymbol}** will be deducted from your next task.`,
        issue.number
      );
    } else {
      logger.info(`Skipped penalty because amount is 0`);
    }
  } catch (err) {
    return await _renderErrorDiffWrapper(err, issue);
  }
}

async function commandCallback(issue: number, comment: string, action: string, replyTo?: Comment) {
  // Default callback for slash commands
  await upsertCommentToIssue(issue, comment, action, replyTo);
}

export function userCommands(): UserCommands[] {
  return [
    {
      id: IssueCommentCommands.START,
      description: "Assign yourself to the issue.",
      example: void 0,
      handler: assign,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.STOP,
      description: "Unassign yourself from the issue.",
      example: void 0,
      handler: unassign,
      callback: commandCallback,
    },
    {
      handler: listAvailableCommands,
      id: IssueCommentCommands.HELP,
      description: "List all available commands.",
      example: void 0,
      callback: commandCallback,
    },
    // Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
    /*{
    id: IssueCommentCommands.PAYOUT,
    description: "Disable automatic payment for the issue.",
    handler: payout,
    callback: commandCallback,
  },*/
    {
      id: IssueCommentCommands.AUTOPAY,
      description: "Toggle automatic payment for the completion of the current issue.",
      example: void 0,
      handler: autoPay,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.QUERY,
      description: `Comments the users multiplier and address.`,
      example: void 0,
      handler: query,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.ASK,
      description: `Ask a technical question to UbiquiBot.`,
      example: "/ask how do I do x?",
      handler: ask,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.MULTIPLIER,
      description: `Set the task payout multiplier for a specific contributor, and provide a reason for why.`,
      example: '/wallet @user 0.5 "multiplier reason"',
      handler: multiplier,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.LABELS,
      description: `Set access control, for admins only.`,
      example: void 0,
      handler: setLabels,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.AUTHORIZE,
      description: `Approve a label change, for admins only.`,
      example: void 0,
      handler: approveLabelChange,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.WALLET,
      description: `Register your wallet address for payments. Your message to sign is: "UbiquiBot". You can generate a signature hash using https://etherscan.io/verifiedSignatures`,
      example:
        "/wallet ubq.eth 0xe2a3e34a63f3def2c29605de82225b79e1398190b542be917ef88a8e93ff9dc91bdc3ef9b12ed711550f6d2cbbb50671aa3f14a665b709ec391f3e603d0899a41b",
      handler: registerWallet,
      callback: commandCallback,
    },
  ];
}
