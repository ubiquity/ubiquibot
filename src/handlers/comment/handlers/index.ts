import { Comment, UserCommands } from "../../../types";
import { IssueCommentCommand } from "../commands";
import { assign } from "./assign";
import { listAvailableCommands } from "./help";
// Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
// import { payout } from "./payout";
import { ask } from "./ask";
import { approveLabelChange } from "./authorize";
import { setLabels } from "./labels";
import { multiplier } from "./multiplier";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
// import { addPenalty } from "../../../adapters/supabase";
import { upsertCommentToIssue } from "../../../helpers";

import { HandlerReturnValuesNoVoid } from "../../../types/handlers";
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

// Parses the comment body and figure out the command name a user wants
export function commentParser(body: string): null | IssueCommentCommand {
  const regex = /^\/(\w+)\b/; // Regex pattern to match the command at the beginning of the body

  const matches = regex.exec(body);
  if (matches) {
    const command = matches[0] as IssueCommentCommand;
    if (Object.values(IssueCommentCommand).includes(command)) {
      return command;
    }
  }

  return null;
}

async function commandCallback(issue: number, comment: HandlerReturnValuesNoVoid, action: string, replyTo?: Comment) {
  // Default callback for slash commands
  await upsertCommentToIssue(issue, comment, action, replyTo);
}

export function userCommands(): UserCommands[] {
  return [
    {
      id: IssueCommentCommand.START,
      description: "Assign yourself to the issue.",
      example: void 0,
      handler: assign,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.STOP,
      description: "Unassign yourself from the issue.",
      example: void 0,
      handler: unassign,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.HELP,
      description: "List all available commands.",
      example: void 0,
      handler: listAvailableCommands,
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
      id: IssueCommentCommand.AUTOPAY,
      description: "Toggle automatic payment for the completion of the current issue.",
      example: void 0,
      handler: autoPay,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.QUERY,
      description: "Comments the users multiplier and address.",
      example: void 0,
      handler: query,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.ASK,
      description: "Ask a technical question to UbiquiBot.",
      example: "/ask how do I do x?",
      handler: ask,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.MULTIPLIER,
      description: "Set the task payout multiplier for a specific contributor, and provide a reason for why.",
      example: '/wallet @user 0.5 "multiplier reason"',
      handler: multiplier,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.LABELS,
      description: "Set access control, for admins only.",
      example: void 0,
      handler: setLabels,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.AUTHORIZE,
      description: "Approve a label change, for admins only.",
      example: void 0,
      handler: approveLabelChange,
      callback: commandCallback,
    },
    {
      id: IssueCommentCommand.WALLET,
      description:
        'Register your wallet address for payments. Your message to sign is: "UbiquiBot". You can generate a signature hash using https://etherscan.io/verifiedSignatures',
      example:
        "/wallet ubq.eth 0xe2a3e34a63f3def2c29605de82225b79e1398190b542be917ef88a8e93ff9dc91bdc3ef9b12ed711550f6d2cbbb50671aa3f14a665b709ec391f3e603d0899a41b",
      handler: registerWallet,
      callback: commandCallback,
    },
  ];
}
