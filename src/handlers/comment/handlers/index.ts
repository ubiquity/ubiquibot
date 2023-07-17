import { getBotConfig } from "../../../bindings";
import { Comment, Payload, UserCommands } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { assign } from "./assign";
import { listAvailableCommands } from "./help";
// Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
// import { payout } from "./payout";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
import { setAccess } from "./set-access";
import { multiplier } from "./multiplier";
import { addCommentToIssue, createLabel, addLabelToIssue, upsertCommentToIssue } from "../../../helpers";
import { getBotContext } from "../../../bindings";
import { handleIssueClosed } from "../../payout";

export * from "./assign";
export * from "./wallet";
export * from "./unassign";
export * from "./payout";
export * from "./help";
export * from "./multiplier";

/**
 * Parses the comment body and figure out the command name a user wants
 *
 *
 * @param body - The comment body
 * @returns The list of command names the comment includes
 */
export const commentParser = (body: string): IssueCommentCommands[] => {
  // TODO: As a starting point, it may be simple but there could be cases for the comment to includes one or more commands
  // We need to continuously improve to parse even complex comments. Right now, we implement it simply.
  const commandList = Object.values(IssueCommentCommands) as string[];
  const result = commandList.filter((command: string) => body.startsWith(command));
  return result as IssueCommentCommands[];
};

/**
 * Callback for issues closed - Processor
 */

export const issueClosedCallback = async (): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const issue = (_payload as Payload).issue;
  if (!issue) return;
  try {
    const comment = await handleIssueClosed();
    if (comment) await addCommentToIssue(comment, issue.number);
    await addCommentToIssue(
      `If you enjoy the DevPool experience, please follow <a href="https://github.com/ubiquity">Ubiquity on GitHub</a> and star <a href="https://github.com/ubiquity/devpool-directory">this repo</a> to show your support. It helps a lot!`,
      issue.number
    );
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
    const timeLabelConfigs = config.price.timeLabels.sort((label1, label2) => label1.weight - label2.weight);
    const priorityLabelConfigs = config.price.priorityLabels.sort((label1, label2) => label1.weight - label2.weight);
    const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
    const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

    if (timeLabels.length === 0 && timeLabelConfigs.length > 0) await createLabel(timeLabelConfigs[0].name);
    if (priorityLabels.length === 0 && priorityLabelConfigs.length > 0) await createLabel(priorityLabelConfigs[0].name);
    await addLabelToIssue(timeLabelConfigs[0].name);
    await addLabelToIssue(priorityLabelConfigs[0].name);
    return;
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

export const userCommands: UserCommands[] = [
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
    id: IssueCommentCommands.MULTIPLIER,
    description: `Set bounty multiplier (for treasury)`,
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
    description: `<WALLET_ADDRESS | ENS_NAME>: Register the hunter's wallet address. \n  ex1: /wallet 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \n  ex2: /wallet vitalik.eth\n`,
    handler: registerWallet,
    callback: commandCallback,
  },
];
