import { Comment, Payload, UserCommands } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { assign } from "./assign";
import { listAvailableCommands } from "./help";
// Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
// import { payout } from "./payout";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
import { setAccess } from "./allow";
import { ask } from "./ask";
import { multiplier } from "./multiplier";
import { BigNumber, ethers } from "ethers";
import { addPenalty } from "../../../adapters/supabase";
import {
  addCommentToIssue,
  createLabel,
  addLabelToIssue,
  getLabel,
  upsertCommentToIssue,
  getAllIssueComments,
  getPayoutConfigByNetworkId,
  getTokenSymbol,
  getAllIssueAssignEvents,
  calculateWeight,
} from "../../../helpers";
import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { handleIssueClosed } from "../../payout";
import { query } from "./query";
import { autoPay } from "./payout";
import { getTargetPriceLabel } from "../../shared";
import { ErrorDiff } from "../../../utils/helpers";

export * from "./assign";
export * from "./wallet";
export * from "./unassign";
export * from "./payout";
export * from "./help";
export * from "./multiplier";
export * from "./query";
export * from "./ask";

/**
 * Parses the comment body and figure out the command name a user wants
 *
 *
 * @param body - The comment body
 * @returns The list of command names the comment includes
 */

export const commentParser = (body: string): IssueCommentCommands[] => {
  const regex = /^\/(\w+)\b/; // Regex pattern to match the command at the beginning of the body

  const matches = regex.exec(body);
  if (matches) {
    const command = matches[0] as IssueCommentCommands;
    if (Object.values(IssueCommentCommands).includes(command)) {
      return [command];
    }
  }

  return [];
};

/**
 * Callback for issues closed - Processor
 */

export const issueClosedCallback = async (): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const { comments } = getBotConfig();
  const issue = (_payload as Payload).issue;
  if (!issue) return;
  try {
    const comment = await handleIssueClosed();
    if (comment) await addCommentToIssue(comment + comments.promotionComment, issue.number);
  } catch (err: unknown) {
    return await addCommentToIssue(ErrorDiff(err), issue.number);
  }
};

/**
 * Callback for issues created - Processor
 */

export const issueCreatedCallback = async (): Promise<void> => {
  const logger = getLogger();
  const { payload: _payload } = getBotContext();
  const config = getBotConfig();
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
      timeLabels.length > 0 ? timeLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : config.price.defaultLabels[0];
    const minPriorityLabel =
      priorityLabels.length > 0 ? priorityLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : config.price.defaultLabels[1];
    if (!timeLabels.length) await addLabelToIssue(minTimeLabel);
    if (!priorityLabels.length) await addLabelToIssue(minPriorityLabel);

    const targetPriceLabel = getTargetPriceLabel(minTimeLabel, minPriorityLabel);
    if (targetPriceLabel && !labels.map((i) => i.name).includes(targetPriceLabel)) {
      const exist = await getLabel(targetPriceLabel);
      if (!exist) await createLabel(targetPriceLabel, "price");
      await addLabelToIssue(targetPriceLabel);
    }
  } catch (err: unknown) {
    await addCommentToIssue(ErrorDiff(err), issue.number);
  }
};

/**
 * Callback for issues reopened - Processor
 */

export const issueReopenedCallback = async (): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const {
    payout: { permitBaseUrl },
  } = getBotConfig();
  const logger = getLogger();
  const issue = (_payload as Payload).issue;
  const repository = (_payload as Payload).repository;
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
      try {
        await addPenalty(assignee, repository.full_name, tokenAddress, networkId.toString(), amount);
      } catch (err) {
        logger.error(`Error writing penalty to db: ${err}`);
        return;
      }

      await addCommentToIssue(
        `@${assignee} please be sure to review this conversation and implement any necessary fixes. Unless this is closed as completed, its payment of **${formattedAmount} ${tokenSymbol}** will be deducted from your next bounty.`,
        issue.number
      );
    } else {
      logger.info(`Skipped penalty because amount is 0`);
    }
  } catch (err: unknown) {
    await addCommentToIssue(ErrorDiff(err), issue.number);
  }
};

/**
 * Default callback for slash commands
 *
 *
 * @param issue_number - The issue number
 * @param comment - Comment string
 */

const commandCallback = async (issue_number: number, comment: string, action: string, reply_to?: Comment) => {
  await upsertCommentToIssue(issue_number, comment, action, reply_to);
};

export const userCommands = (): UserCommands[] => {
  const config = getBotConfig();

  return [
    {
      id: IssueCommentCommands.START,
      description: "Assign the origin sender to the issue automatically.",
      handler: assign,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.STOP,
      description: "Unassign the origin sender from the issue automatically.",
      handler: unassign,
      callback: commandCallback,
    },
    {
      handler: listAvailableCommands,
      id: IssueCommentCommands.HELP,
      description: "List all available commands.",
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
      handler: autoPay,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.QUERY,
      description: `Comments the users multiplier and address`,
      handler: query,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.ASK,
      description: `Ask a technical question to the Ubiquity AI. \n  example usage: "/ask How do I do X?"`,
      handler: ask,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.MULTIPLIER,
      description: `Set the bounty payout multiplier for a specific contributor, and provide the reason for why. \n  example usage: "/wallet @user 0.5 'Multiplier reason'"`,
      handler: multiplier,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.ALLOW,
      description: `Set access control. (Admin Only)`,
      handler: setAccess,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.WALLET,
      description: config.wallet.registerWalletWithVerification
        ? `<WALLET_ADDRESS | ENS_NAME> <SIGNATURE_HASH>: Register the hunter's wallet address. \n  Your message to sign is: DevPool\n  You can generate SIGNATURE_HASH at https://etherscan.io/verifiedSignatures\n  ex1: /wallet 0x0000000000000000000000000000000000000000 0xe2a3e34a63f3def2c29605de82225b79e1398190b542be917ef88a8e93ff9dc91bdc3ef9b12ed711550f6d2cbbb50671aa3f14a665b709ec391f3e603d0899a41b\n  ex2: /wallet vitalik.eth 0x75329f883590507e581cd6dfca62680b6cd12e1f1665db8097f9e642ed70025146b5cf9f777dde90c4a9cbd41500a6bf76bc394fd0b0cae2aab09f7a6f30e3b31b\n`
        : `<WALLET_ADDRESS | ENS_NAME>: Register the hunter's wallet address. \n  ex1: /wallet 0x0000000000000000000000000000000000000000\n  ex2: /wallet vitalik.eth\n`,
      handler: registerWallet,
      callback: commandCallback,
    },
  ];
};
