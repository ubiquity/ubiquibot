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
import { taskInfo } from "../wildcard";
import { GLOBAL_STRINGS } from "../../configs";
import { isParentIssue } from "../pricing";
import Decimal from "decimal.js";
import { getUserMultiplier } from "../comment/handlers/assign/get-user-multiplier";
import { getWalletAddress } from "../comment/handlers/assign/get-wallet-address";
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

export async function incentivesCalculation(): Promise<IncentivesCalculationResult> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const {
    payout: { paymentToken, rpc, permitBaseUrl, evmNetworkId, privateKey },
    mode: { incentiveMode, permitMaxPrice },
    price: { incentives, issueCreatorMultiplier, priceMultiplier },
    publicAccessControl: accessControl,
  } = runtime.botConfig;
  const logger = runtime.logger;
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
  const permitCommentIndex = comments.findIndex((e) => e.user.type === UserType.Bot && e.body.match(claimUrlRegex));
  if (wasReopened && permitCommentIndex !== -1) {
    const permitComment = comments[permitCommentIndex];
    const permitUrl = permitComment.body.match(claimUrlRegex);
    if (!permitUrl || permitUrl.length < 2) {
      throw logger.error(`Permit URL not found`);
    }
    const url = new URL(permitUrl[1]);
    const claimBase64 = url.searchParams.get("claim");
    if (!claimBase64) {
      throw logger.error(`Permit claim search parameter not found`);
    }
    const networkQuery = url.searchParams.get("network");
    if (!networkQuery) {
      throw logger.error(`Permit network search parameter not found`);
    }
    let evmNetworkId = parseInt(networkQuery);
    if (!evmNetworkId) {
      evmNetworkId = 1;
    }
    const claim = JSON.parse(Buffer.from(claimBase64, "base64").toString("utf-8"));
    const amount = new Decimal(claim.permit.permitted.amount);
    const events = await getAllIssueAssignEvents(issue.number);
    if (events.length === 0) {
      throw logger.error(`No assignment found`);
    }
    const assignee = events[0].assignee;
    try {
      await removePenalty({
        userId: assignee.id,
        amount,
        node: permitComment,
      });
    } catch (err) {
      throw logger.error("Error writing penalty to db", err);
    }
    throw logger.warn(`Penalty removed`);
  }
  if (!incentiveMode) {
    throw logger.warn(`No incentive mode. skipping to process`);
  }
  if (privateKey == null) {
    throw logger.warn(
      "Permit generation disabled because EVM wallet private key is not set. Let the maintainers know."
    );
  }
  if (issue.state_reason !== StateReason.COMPLETED) {
    throw logger.warn("Permit generation disabled because this was not closed as completed.");
  }
  logger.info(`Checking if the issue is a parent issue.`);
  if (issue.body && isParentIssue(issue.body)) {
    await clearAllPriceLabelsOnIssue();
    throw logger.error("Permit generation disabled because this is a collection of issues.");
  }
  logger.info("Checking if the issue is an eligible task.", { issue });
  for (const botComment of comments.filter((cmt) => cmt.user.type === UserType.Bot).reverse()) {
    const botCommentBody = botComment.body;
    if (botCommentBody.includes(GLOBAL_STRINGS.autopayComment)) {
      const pattern = /\*\*(\w+)\*\*/;
      const res = botCommentBody.match(pattern);
      if (res) {
        if (res[1] === "false") {
          throw logger.warn(`Skipping to generate permit2 url, reason: autoPayMode for this issue: false`);
        }
        break;
      }
    }
  }
  if (permitMaxPrice == 0 || !permitMaxPrice) {
    throw logger.warn("Skipping to generate permit2 url, reason: permitMaxPrice is 0 or undefined", { permitMaxPrice });
  }
  const issueDetailed = taskInfo(issue);
  if (!issueDetailed.isTask) {
    throw logger.warn(`Skipping... its not an eligible task`);
  }
  if (!issueDetailed.priceLabel || !issueDetailed.priorityLabel || !issueDetailed.timeLabel) {
    throw logger.warn(`Skipping... its not an eligible task`);
  }
  const { label } = runtime.adapters.supabase;
  const labelChanges = await label.getLabelChanges(repository.full_name);
  if (labelChanges) {
    labelChanges.forEach((labelChange) => {
      if (labelChange.authorized === false) {
        throw logger.warn(`Skipping... label was changed by unauthorized user`);
      }
    });
  }

  const assignees = issue?.assignees ?? [];
  const assignee = assignees.length > 0 ? assignees[0] : undefined;
  if (!assignee) {
    throw logger.warn("Skipping to proceed the payment because `assignee` is undefined");
  }

  if (!issueDetailed.priceLabel) {
    throw logger.warn("Skipping to proceed the payment because price not set");
  }

  const recipient = await getWalletAddress(assignee.login);
  if (!recipient || recipient?.trim() === null) {
    throw logger.warn(`Recipient address is missing`);
  }

  const userMultiplier = await getUserMultiplier(assignee.id, repository.id);

  if (!userMultiplier) {
    throw logger.warn(`User multiplier is missing`);
  }

  const multiplier = userMultiplier.value;

  if (multiplier === 0) {
    throw logger.warn("Refusing to generate the payment permit because multiplier is 0", { assignee });
  }

  const permitComments = comments.filter(
    (content) => content.body.includes("https://pay.ubq.fi?claim=") && content.user.type == UserType.Bot
  );

  if (permitComments.length > 0) {
    throw logger.warn(`skip to generate a permit url because it has been already posted`);
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
