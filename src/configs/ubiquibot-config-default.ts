import { MergedConfig } from "../types";

export const DefaultConfig: MergedConfig = {
  evmNetworkId: 100,
  priceMultiplier: 1,
  issueCreatorMultiplier: 2,
  paymentPermitMaxPrice: Number.MAX_SAFE_INTEGER,
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
      name: "Time: <1 Day",
    },
    {
      name: "Time: <1 Week",
    },
    {
      name: "Time: <2 Weeks",
    },
    {
      name: "Time: <1 Month",
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
      elements: {
        h1: 0,
        h2: 0,
        h3: 0,
        h4: 0,
        h5: 0,
        h6: 0,
        a: 0,
        ul: 0,
        li: 0,
        p: 0,
        img: 0,
        code: 0,
        table: 0,
        td: 0,
        tr: 0,
        br: 0,
        blockquote: 0,
        em: 0,
        strong: 0,
        hr: 0,
        del: 0,
        pre: 0,
        ol: 0,
      },
      totals: {
        word: 0,
      },
    },
  },
  enableAccessControl: {
    label: false,
    organization: true,
  },
  staleBountyTime: "0d",
  newContributorGreeting: {
    enabled: true,
    header:
      "Thank you for contributing to UbiquiBot! Please be sure to set your wallet address before completing your first bounty so that the automatic payout upon task completion will work for you.",
    helpMenu: true,
    footer:
      "###### Also please star this repository and [@ubiquity/devpool-directory](https://github.com/ubiquity/devpool-directory/) to show your support. It helps a lot!",
  },
};
