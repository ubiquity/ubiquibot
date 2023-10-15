import { Config } from "../types";

export const repoConfig: Config = {
  evmNetworkId: 100,
  priceMultiplier: 1,
  issueCreatorMultiplier: 1,
  timeLabels: [
    { name: "Time: <1 Hour" },
    { name: "Time: <2 Hours" },
    { name: "Time: <4 Hours" },
    { name: "Time: <1 Day" },
    { name: "Time: <1 Week" },
  ],
  priorityLabels: [
    { name: "Priority: 1 (Normal)" },
    { name: "Priority: 2 (Medium)" },
    { name: "Priority: 3 (High)" },
    { name: "Priority: 4 (Urgent)" },
    { name: "Priority: 5 (Emergency)" },
  ],
  defaultLabels: ["Time: <1 Hour", "Priority: 1 (Normal)"],
  permitMaxPrice: 1000,
  incentiveMode: true,
  maxConcurrentTasks: 5,
  promotionComment: null,
  assistivePricing: true,
  registerWalletWithVerification: false,
  commandSettings: [
    { name: "start", enabled: true },
    { name: "stop", enabled: true },
    { name: "wallet", enabled: true },
    { name: "multiplier", enabled: true },
    { name: "query", enabled: true },
    { name: "autopay", enabled: true },
    { name: "labels", enabled: true },
    { name: "help", enabled: true },
    { name: "payout", enabled: true },
  ],
  disableAnalytics: true,
  publicAccessControl: {
    setLabel: true,
    fundExternalClosedIssue: true,
  },
  incentives: {
    comment: {
      elements: {
        code: 5,
        img: 5,
        h1: 1,
        li: 0.5,
        a: 0.5,
        blockquote: 0,
      },
      totals: {
        word: 0.1,
      },
    },
  },
  // openAIKey: null,
  // privateKeyEncrypted: null,
  openAITokenLimit: 100000,
  staleTaskTime: "15 minutes",

  newContributorGreeting: {
    enabled: true,
    header: "Welcome to the test sandbox! My Header!",
    helpMenu: true,
    footer: "Please note that this is a footer from a bot. Thanks!",
  },
};
