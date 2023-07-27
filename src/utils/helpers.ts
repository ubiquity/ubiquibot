import { CommentElementPricing } from "../types";
import { WideLabel, WideOrgConfig, WideRepoConfig, WideConfig } from "./private";
interface Configs {
  parsedRepo?: WideRepoConfig;
  parsedOrg?: WideOrgConfig;
  parsedDefault: WideRepoConfig;
}

export const getNetworkId = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["evm-network-id"] && !Number.isNaN(Number(parsedRepo["evm-network-id"]))) {
    return Number(parsedRepo["evm-network-id"]);
  } else if (parsedOrg && parsedOrg["evm-network-id"] && !Number.isNaN(Number(parsedOrg["evm-network-id"]))) {
    return Number(parsedOrg["evm-network-id"]);
  } else {
    return Number(parsedDefault["evm-network-id"]) || WideConfig["evm-network-id"];
  }
};

export const getBaseMultiplier = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["base-multiplier"] && !Number.isNaN(Number(parsedRepo["base-multiplier"]))) {
    return Number(parsedRepo["base-multiplier"]);
  } else if (parsedOrg && parsedOrg["base-multiplier"] && !Number.isNaN(Number(parsedOrg["base-multiplier"]))) {
    return Number(parsedOrg["base-multiplier"]);
  } else {
    return Number(parsedDefault["base-multiplier"]) || WideConfig["base-multiplier"];
  }
};

export const getCreatorMultiplier = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["issue-creator-multiplier"] && !Number.isNaN(Number(parsedRepo["issue-creator-multiplier"]))) {
    return Number(parsedRepo["issue-creator-multiplier"]);
  } else if (parsedOrg && parsedOrg["issue-creator-multiplier"] && !Number.isNaN(Number(parsedOrg["issue-creator-multiplier"]))) {
    return Number(parsedOrg["issue-creator-multiplier"]);
  } else {
    return Number(parsedDefault["issue-creator-multiplier"]) || WideConfig["issue-creator-multiplier"];
  }
};

export const getTimeLabels = ({ parsedRepo, parsedOrg }: Configs): WideLabel[] => {
  if (parsedRepo && parsedRepo["time-labels"] && Array.isArray(parsedRepo["time-labels"]) && parsedRepo["time-labels"].length > 0) {
    return parsedRepo["time-labels"];
  } else if (parsedOrg && parsedOrg["time-labels"] && Array.isArray(parsedOrg["time-labels"]) && parsedOrg["time-labels"].length > 0) {
    return parsedOrg["time-labels"];
  } else {
    return WideConfig["time-labels"]
  }
};

export const getPriorityLabels = ({ parsedRepo, parsedOrg }: Configs): WideLabel[] => {
  if (parsedRepo && parsedRepo["priority-labels"] && Array.isArray(parsedRepo["priority-labels"]) && parsedRepo["priority-labels"].length > 0) {
    return parsedRepo["priority-labels"];
  } else if (parsedOrg && parsedOrg["priority-labels"] && Array.isArray(parsedOrg["priority-labels"]) && parsedOrg["priority-labels"].length > 0) {
    return parsedOrg["priority-labels"];
  } else {
    return WideConfig["priority-labels"]
  }
};

export const getCommentItemPrice = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): CommentElementPricing => {
  if (parsedRepo && parsedRepo["comment-element-pricing"]) {
    return parsedRepo["comment-element-pricing"];
  } else if (parsedOrg && parsedOrg["comment-element-pricing"]) {
    return parsedOrg["comment-element-pricing"];
  } else {
    return parsedDefault["comment-element-pricing"] || WideConfig["comment-element-pricing"];
  }
};

export const getAutoPayMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["auto-pay-mode"] && typeof parsedRepo["auto-pay-mode"] === "boolean") {
    return parsedRepo["auto-pay-mode"];
  } else if (parsedOrg && parsedOrg["auto-pay-mode"] && typeof parsedOrg["auto-pay-mode"] === "boolean") {
    return parsedOrg["auto-pay-mode"];
  } else {
    return parsedDefault["auto-pay-mode"] || WideConfig["auto-pay-mode"];
  }
};

export const getAnalyticsMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["analytics-mode"] && typeof parsedRepo["analytics-mode"] === "boolean") {
    return parsedRepo["analytics-mode"];
  } else if (parsedOrg && parsedOrg["analytics-mode"] && typeof parsedOrg["analytics-mode"] === "boolean") {
    return parsedOrg["analytics-mode"];
  } else {
    return parsedDefault["analytics-mode"] || WideConfig["analytics-mode"];
  }
};

export const getPromotionComment = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): string => {
  if (parsedRepo && parsedRepo["promotion-comment"] && typeof parsedRepo["promotion-comment"] === "string") {
    return parsedRepo["promotion-comment"];
  } else if (parsedOrg && parsedOrg["promotion-comment"] && typeof parsedOrg["promotion-comment"] === "string") {
    return parsedOrg["promotion-comment"];
  } else {
    return parsedDefault["promotion-comment"] || WideConfig["promotion-comment"];
  }
};

export const getIncentiveMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["incentive-mode"] && typeof parsedRepo["incentive-mode"] === "boolean") {
    return parsedRepo["incentive-mode"];
  } else if (parsedOrg && parsedOrg["incentive-mode"] && typeof parsedOrg["incentive-mode"] === "boolean") {
    return parsedOrg["incentive-mode"];
  } else {
    return parsedDefault["incentive-mode"] || WideConfig["incentive-mode"];
  }
};

export const getBountyHunterMax = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["max-concurrent-bounties"] && !Number.isNaN(Number(parsedRepo["max-concurrent-bounties"]))) {
    return Number(parsedRepo["max-concurrent-bounties"]);
  } else if (parsedOrg && parsedOrg["max-concurrent-bounties"] && !Number.isNaN(Number(parsedOrg["max-concurrent-bounties"]))) {
    return Number(parsedOrg["max-concurrent-bounties"]);
  } else {
    return Number(parsedDefault["max-concurrent-bounties"]) || WideConfig["max-concurrent-bounties"];
  }
};

export const getDefaultLabels = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): string[] => {
  if (parsedRepo && parsedRepo["default-labels"]) {
    return parsedRepo["default-labels"];
  } else if (parsedOrg && parsedOrg["default-labels"]) {
    return parsedOrg["default-labels"];
  } else {
    return parsedDefault["default-labels"] || WideConfig["default-labels"];
  }
};
