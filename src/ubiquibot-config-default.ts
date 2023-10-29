import fs from "fs";
import path from "path";
import { MergedConfig } from "./types";
const commandFiles = fs.readdirSync(path.resolve(__dirname, "../src/handlers/comment/handlers"));
const promotionComment =
  "###### If you enjoy the DevPool experience, please follow [Ubiquity on GitHub](https://github.com/ubiquity) and star [this repo](https://github.com/ubiquity/devpool-directory) to show your support. It helps a lot!";

export const DefaultConfig: MergedConfig = {
  evmNetworkId: 1,
  priceMultiplier: 1,
  issueCreatorMultiplier: 1,
  maxPermitPrice: Number.MAX_SAFE_INTEGER,
  maxConcurrentTasks: Number.MAX_SAFE_INTEGER,
  assistivePricing: false,
  registerWalletWithVerification: false,
  promotionComment,
  defaultLabels: [],
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
  commandSettings: commandFiles.map((file) => {
    const commandName = path.basename(file, path.extname(file));
    return { name: commandName, enabled: false };
  }), // dynamic mount based on file names
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
  publicAccessControl: {
    setLabel: true,
    fundExternalClosedIssue: true,
  },
  staleTaskTime: "1 month",
  reviewDelayTolerance: "1 day",
  permitBaseUrl: "https://pay.ubq.fi",
  taskFollowUpDuration: "0.5 weeks",
  taskDisqualifyDuration: "1 week",
  newContributorGreeting: {
    enabled: true,
    header:
      "Thank you for contributing! Please be sure to set your wallet address before completing your first task so that you can collect your reward.",
    displayHelpMenu: true,
    footer: promotionComment,
  },
};
