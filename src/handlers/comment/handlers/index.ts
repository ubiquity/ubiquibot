import { Comment, Payload, UserCommands } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { assign } from "./assign";
import { listAvailableCommands } from "./help";
// Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
// import { payout } from "./payout";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
import { setAccess } from "./allow";
import { multiplier } from "./multiplier";
import { addCommentToIssue, createLabel, addLabelToIssue, getLabel, upsertCommentToIssue } from "../../../helpers";
import { getBotConfig, getBotContext } from "../../../bindings";
import { handleIssueClosed } from "../../payout";
import { query } from "./query";

export * from "./assign";
export * from "./wallet";
export * from "./unassign";
export * from "./payout";
export * from "./help";
export * from "./multiplier";
export * from "./query";

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
    return await addCommentToIssue(`Error: ${err}`, issue.number);
  }
};

/**
 * Callback for issues created - Processor
 */

export const issueCreatedCallback = async (): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const config = getBotConfig();
  const issue = (_payload as Payload).issue;
  if (!issue) return;
  const labels = issue.labels;
  try {
    const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
    const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

    if (timeLabels.length === 0 && priorityLabels.length === 0) {
      for (const label of config.price.defaultLabels) {
        const exists = await getLabel(label);
        if (!exists) await createLabel(label);
        await addLabelToIssue(label);
      }
    }
  } catch (err: unknown) {
    return await addCommentToIssue(`Error: ${err}`, issue.number);
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
      id: IssueCommentCommands.ASSIGN,
      description: "Assign the origin sender to the issue automatically.",
      handler: assign,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommands.UNASSIGN,
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
      id: IssueCommentCommands.QUERY,
      description: `Comments the users multiplier and address`,
      handler: query,
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
