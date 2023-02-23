import { ActionHandler } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { assign } from "./assign";
import { registerWallet } from "./wallet";

export * from "./assign";
export * from "./wallet";

/**
 * Parses the comment body and figure out the command name a user wants
 *
 *
 * @param body - The comment body
 * @returns The list of command names the comment includes
 */
export const commentPaser = (body: string): IssueCommentCommands[] => {
  // TODO: As a starting point, it may be simple but there could be cases for the comment to includes one or more commands
  // We need to continuously improve to parse even complex comments. Right now, we implement it simply.
  const commandList = Object.values(IssueCommentCommands) as string[];
  const result = commandList.filter((command: string) => body.includes(command));
  return result as IssueCommentCommands[];
};

export const commandHandlers: Record<string, ActionHandler> = {
  [IssueCommentCommands.ASSIGN]: assign,
  [IssueCommentCommands.WALLET]: registerWallet,
};
