import { assign } from "./assign";
import { listAvailableCommands } from "./help";
// Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
// import { payout } from "./payout";
import { ask } from "./ask";
import { authorizeLabelChanges } from "./authorize";
import { setLabels } from "./labels";
import { multiplier } from "./multiplier";
import { unassign } from "./unassign";
import { registerWallet } from "./wallet";
// import { addPenalty } from "../../../adapters/supabase";

import { autoPay } from "./payout";
import { query } from "./query";
import { UserCommands } from "../../../types/handlers";

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
export function commentParser(body: string): null | string {
  const userCommandIds = userCommands(false).map((cmd) => cmd.id);
  const regex = new RegExp(`^(${userCommandIds.join("|")})\\b`); // Regex pattern to match any command at the beginning of the body

  const matches = regex.exec(body);
  if (matches) {
    const command = matches[0] as string;
    if (userCommandIds.includes(command)) {
      return command;
    }
  }

  return null;
}

export function userCommands(walletVerificationEnabled: boolean): UserCommands[] {
  const accountForWalletVerification = walletVerificationDetails(walletVerificationEnabled);
  return [
    {
      id: "/start",
      description: "Assign yourself to the issue.",
      example: "/start",
      handler: assign,
    },
    {
      id: "/stop",
      description: "Unassign yourself from the issue.",
      example: "/stop",
      handler: unassign,
    },
    {
      id: "/help",
      description: "List all available commands.",
      example: "/help",
      handler: listAvailableCommands,
    },
    // Commented out until Gnosis Safe is integrated (https://github.com/ubiquity/ubiquibot/issues/353)
    /*{
    id: "/payout",
    description: "Disable automatic payment for the issue.",
    handler: payout,
  },*/
    {
      id: "/autopay",
      description: "Toggle automatic payment for the completion of the current issue.",
      example: "/autopay true",
      handler: autoPay,
    },
    {
      id: "/query",
      description: "Returns the user's wallet, access, and multiplier information.",
      example: "/query @user",
      handler: query,
    },
    {
      id: "/ask",
      description: "Ask a context aware question.",
      example: "/ask is x or y the best approach?",
      handler: ask,
    },
    {
      id: "/multiplier",
      description: "Set the task payout multiplier for a specific contributor, and provide a reason for why.",
      example: '/multiplier @user 0.5 "multiplier reason"',
      handler: multiplier,
    },
    {
      id: "/labels",
      description: "Set access control, for admins only.",
      example: "/labels @user priority time price", // Ensure there are spaces between words
      handler: setLabels,
    },
    {
      id: "/authorize",
      description: "Approve a label change, for admins only.",
      example: "/authorize",
      handler: authorizeLabelChanges,
    },
    {
      id: "/wallet",
      description: accountForWalletVerification.description,
      example: accountForWalletVerification.example,
      handler: registerWallet,
    },
  ];
}

function walletVerificationDetails(walletVerificationEnabled: boolean) {
  const base = {
    description: "Register your wallet address for payments.",
    example: "/wallet ubq.eth",
  };

  const withVerification = {
    description:
      'Your message to sign is: "UbiquiBot". You can generate a signature hash using https://etherscan.io/verifiedSignatures',
    example:
      "0xe2a3e34a63f3def2c29605de82225b79e1398190b542be917ef88a8e93ff9dc91bdc3ef9b12ed711550f6d2cbbb50671aa3f14a665b709ec391f3e603d0899a41b",
  };

  if (walletVerificationEnabled) {
    return {
      description: `${base.description} ${withVerification.description}`,
      example: `${base.example} ${withVerification.example}`,
    };
  } else {
    return base;
  }
}
