import fs from "fs";
import path from "path";
import { validHTMLElements } from "./handlers/comment/handlers/issue/valid-html-elements";
import { LogLevel } from "./adapters/supabase/helpers/tables/logs";

const commandFiles = fs.readdirSync(path.resolve(__dirname, "../src/handlers/comment/handlers"));
const commands = commandFiles.map((file) => {
  // dynamic mount based on file names
  const commandName = path.basename(file, path.extname(file));
  return { name: commandName, enabled: false };
});
const promotionComment =
  "###### If you enjoy the DevPool experience, please follow [Ubiquity on GitHub](https://github.com/ubiquity) and star [this repo](https://github.com/ubiquity/devpool-directory) to show your support. It helps a lot!";
const allHtmlElementsSetToZero = validHTMLElements.reduce<Record<keyof HTMLElementTagNameMap, number>>(
  (accumulator, current) => {
    accumulator[current] = 0;
    return accumulator;
  },
  {} as Record<keyof HTMLElementTagNameMap, number>
);

export default {
  logs: {
    environment: "development",
    level: LogLevel.SILLY,
    retryLimit: 8,
  },

  features: {
    assistivePricing: false,
    defaultLabels: [],
    newContributorGreeting: {
      header:
        "Thank you for contributing! \
        Please be sure to set your wallet address \
        before completing your first task so that you can \
        collect your reward.",
      displayHelpMenu: true,
      footer: promotionComment,
    },
    publicAccessControl: {
      setLabel: true,
      fundExternalClosedIssue: true,
    },
  },
  timers: {
    taskStaleTimeoutDuration: "1 month",
    taskDisqualifyDuration: "1 week",
    taskFollowUpDuration: "0.5 weeks",
    reviewDelayTolerance: "1 day",
  },
  payments: {
    evmNetworkId: 1,
    basePriceMultiplier: 1,
    issueCreatorMultiplier: 1,
    maxPermitPrice: Number.MAX_SAFE_INTEGER,
  },
  commands,

  incentives: {
    comment: {
      elements: allHtmlElementsSetToZero,
      totals: {
        character: 0,
        word: 0,
        sentence: 0,
        paragraph: 0,
        comment: 0,
      },
    },
  },

  miscellaneous: {
    maxConcurrentTasks: Number.MAX_SAFE_INTEGER,
    registerWalletWithVerification: false,
    promotionComment,
  },

  labels: {
    time: [
      { name: "Time: <1 Hour" },
      { name: "Time: <2 Hours" },
      { name: "Time: <4 Hours" },
      { name: "Time: <1 Day" },
      { name: "Time: <1 Week" },
    ],
    priority: [
      { name: "Priority: 1 (Normal)" },
      { name: "Priority: 2 (Medium)" },
      { name: "Priority: 3 (High)" },
      { name: "Priority: 4 (Urgent)" },
      { name: "Priority: 5 (Emergency)" },
    ],
  },
};
