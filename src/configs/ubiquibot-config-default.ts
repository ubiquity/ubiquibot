import { MergedConfig } from "../types";

export const DefaultConfig: MergedConfig = {
  evmNetworkId: 1,
  priceMultiplier: 1,
  issueCreatorMultiplier: 1,
  permitMaxPrice: Number.MAX_SAFE_INTEGER,
  maxConcurrentAssigns: Number.MAX_SAFE_INTEGER,
  assistivePricing: false,
  disableAnalytics: false,
  commentIncentives: false,
  registerWalletWithVerification: false,
  promotionComment:
    "\n<h6>If you enjoy the DevPool experience, please follow <a href='https://github.com/ubiquity'>Ubiquity on GitHub</a> and star <a href='https://github.com/ubiquity/devpool-directory'>this repo</a> to show your support. It helps a lot!</h6>",
  defaultLabels: [],
  timeLabels: [
    {
      name: "Time: <1 Hour",
    },
    {
      name: "Time: <2 Hours",
    },
    {
      name: "Time: <4 Hours",
    },
    {
      name: "Time: <1 Day",
    },
    {
      name: "Time: <1 Week",
    },
  ],
  priorityLabels: [
    {
      name: "Priority: 1 (Normal)",
    },
    {
      name: "Priority: 2 (Medium)",
    },
    {
      name: "Priority: 3 (High)",
    },
    {
      name: "Priority: 4 (Urgent)",
    },
    {
      name: "Priority: 5 (Emergency)",
    },
  ],
  commandSettings: [
    {
      name: "start",
      enabled: false,
    },
    {
      name: "stop",
      enabled: false,
    },
    {
      name: "wallet",
      enabled: false,
    },
    {
      name: "payout",
      enabled: false,
    },
    {
      name: "multiplier",
      enabled: false,
    },
    {
      name: "query",
      enabled: false,
    },
    {
      name: "ask",
      enabled: false,
    },
    {
      name: "allow",
      enabled: false,
    },
    {
      name: "autopay",
      enabled: false,
    },
  ],
  incentives: {
    comment: {
      elements: {},
      totals: {
        word: 0,
      },
    },
  },
  publicAccessControl: {
    setLabel: true,
    fundExternalClosedIssue: true,
  },
  staleTaskTime: "0d",
  newContributorGreeting: {
    enabled: false,
    header:
      "Thank you for contributing! Please be sure to set your wallet address before completing your first task so that the automatic payout upon task completion will work for you.",
    helpMenu: true,
    footer:
      "###### Also please star this repository and [@ubiquity/devpool-directory](https://github.com/ubiquity/devpool-directory/) to show your support. It helps a lot!",
  },
};
