import { Payload, UserCommands } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { assign } from "./assign";
import { listAvailableCommands } from "./help";
import { payout } from "./payout";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
import { bountyMultiplier } from "./bountyMultiplier";
import { addCommentToIssue } from "../../../helpers";
import { getBotContext } from "../../../bindings";
import { handleIssueClosed } from "../../payout";

export * from "./assign";
export * from "./wallet";
export * from "./unassign";
export * from "./payout";
export * from "./help";
export * from "./bountyMultiplier";

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
  const result = commandList.filter((command: string) => body.includes(command));
  return result as IssueCommentCommands[];
};

/**
 * Callback for issues closed - Processor
 */

export const issueClosedCallback = async (): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const issue = (_payload as Payload).issue;
  try {
    const comment = await handleIssueClosed();
    return await addCommentToIssue(comment!, issue!.number);
  } catch (err: any) {
    return await addCommentToIssue("Error: " + err.message, issue!.number);
  }
};

/**
 * Default callback for slash commands
 *
 *
 * @param issue_number - The issue number
 * @param comment - Comment string
 */
const commandCallback = async (issue_number: number, comment: string) => {
  await addCommentToIssue(comment, issue_number!);
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
  {
    id: IssueCommentCommands.PAYOUT,
    description: "Disable automatic payment for the issue.",
    handler: payout,
    callback: commandCallback,
  },
  {
    id: IssueCommentCommands.BOUNTYMULTIPLIER,
    description: `Set bounty multiplier (for treasury)`,
    handler: bountyMultiplier,
    callback: commandCallback,
  },
  {
    id: IssueCommentCommands.WALLET,
    description: `<WALLET_ADDRESS | ENS_NAME>: Register the hunter's wallet address. \n  ex1: /wallet 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 \n  ex2: /wallet vitalik.eth\n`,
    handler: registerWallet,
    callback: commandCallback,
  },
];
