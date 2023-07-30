import { DEFAULT_NETWORK_ID, DefaultPriceConfig } from "../configs";
import { CommentElementPricing } from "../types";
import { WideLabel, WideOrgConfig, WideRepoConfig } from "./private";

export const getNetworkId = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): number => {
  if (parsedRepo && parsedRepo["evm-network-id"] && !Number.isNaN(Number(parsedRepo["evm-network-id"]))) {
    return Number(parsedRepo["evm-network-id"]);
  } else if (parsedOrg && parsedOrg["evm-network-id"] && !Number.isNaN(Number(parsedOrg["evm-network-id"]))) {
    return Number(parsedOrg["evm-network-id"]);
  } else {
    return DEFAULT_NETWORK_ID;
  }
};

export const getBaseMultiplier = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): number => {
  if (parsedRepo && parsedRepo["price-multiplier"] && !Number.isNaN(Number(parsedRepo["price-multiplier"]))) {
    return Number(parsedRepo["price-multiplier"]);
  } else if (parsedOrg && parsedOrg["price-multiplier"] && !Number.isNaN(Number(parsedOrg["price-multiplier"]))) {
    return Number(parsedOrg["price-multiplier"]);
  } else {
    return Number(DefaultPriceConfig["baseMultiplier"]);
  }
};

export const getCreatorMultiplier = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): number => {
  if (parsedRepo && parsedRepo["issue-creator-multiplier"] && !Number.isNaN(Number(parsedRepo["issue-creator-multiplier"]))) {
    return Number(parsedRepo["issue-creator-multiplier"]);
  } else if (parsedOrg && parsedOrg["issue-creator-multiplier"] && !Number.isNaN(Number(parsedOrg["issue-creator-multiplier"]))) {
    return Number(parsedOrg["issue-creator-multiplier"]);
  } else {
    return Number(DefaultPriceConfig["issueCreatorMultiplier"]);
  }
};

export const getTimeLabels = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): WideLabel[] => {
  if (parsedRepo && parsedRepo["time-labels"] && Array.isArray(parsedRepo["time-labels"]) && parsedRepo["time-labels"].length > 0) {
    return parsedRepo["time-labels"];
  } else if (parsedOrg && parsedOrg["time-labels"] && Array.isArray(parsedOrg["time-labels"]) && parsedOrg["time-labels"].length > 0) {
    return parsedOrg["time-labels"];
  } else {
    return DefaultPriceConfig["timeLabels"];
  }
};

export const getPriorityLabels = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): WideLabel[] => {
  if (parsedRepo && parsedRepo["priority-labels"] && Array.isArray(parsedRepo["priority-labels"]) && parsedRepo["priority-labels"].length > 0) {
    return parsedRepo["priority-labels"];
  } else if (parsedOrg && parsedOrg["priority-labels"] && Array.isArray(parsedOrg["priority-labels"]) && parsedOrg["priority-labels"].length > 0) {
    return parsedOrg["priority-labels"];
  } else {
    return DefaultPriceConfig["priorityLabels"];
  }
};

export const getCommentItemPrice = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): CommentElementPricing => {
  if (parsedRepo && parsedRepo["comment-element-pricing"]) {
    return parsedRepo["comment-element-pricing"];
  } else if (parsedOrg && parsedOrg["comment-element-pricing"]) {
    return parsedOrg["comment-element-pricing"];
  } else {
    return DefaultPriceConfig["commentElementPricing"];
  }
};

export const getAutoPayMode = (parsedRepo?: WideRepoConfig, parsedOrg?: WideOrgConfig): boolean => {
  if (parsedRepo && parsedRepo["auto-pay-mode"] && typeof parsedRepo["auto-pay-mode"] === "boolean") {
    return parsedRepo["auto-pay-mode"];
  } else if (parsedOrg && parsedOrg["auto-pay-mode"] && typeof parsedOrg["auto-pay-mode"] === "boolean") {
    return parsedOrg["auto-pay-mode"];
  } else {
    return true;
  }
};

export const getAnalyticsMode = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): boolean => {
  if (parsedRepo && parsedRepo["disable-analytics"] && typeof parsedRepo["disable-analytics"] === "boolean") {
    return parsedRepo["disable-analytics"];
  } else if (parsedOrg && parsedOrg["disable-analytics"] && typeof parsedOrg["disable-analytics"] === "boolean") {
    return parsedOrg["disable-analytics"];
  } else {
    return false;
  }
};

export const getPromotionComment = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): string => {
  if (parsedRepo && parsedRepo["promotion-comment"] && typeof parsedRepo["promotion-comment"] === "string") {
    return parsedRepo["promotion-comment"];
  } else if (parsedOrg && parsedOrg["promotion-comment"] && typeof parsedOrg["promotion-comment"] === "string") {
    return parsedOrg["promotion-comment"];
  } else {
    return "\n<h6>If you enjoy the DevPool experience, please follow <a href='https://github.com/ubiquity'>Ubiquity on GitHub</a> and star <a href='https://github.com/ubiquity/devpool-directory'>this repo</a> to show your support. It helps a lot!</h6>";
  }
};

export const getIncentiveMode = (parsedRepo?: WideRepoConfig, parsedOrg?: WideOrgConfig): boolean => {
  if (parsedRepo && parsedRepo["comment-incentives"] && typeof parsedRepo["comment-incentives"] === "boolean") {
    return parsedRepo["comment-incentives"];
  } else if (parsedOrg && parsedOrg["comment-incentives"] && typeof parsedOrg["comment-incentives"] === "boolean") {
    return parsedOrg["comment-incentives"];
  } else {
    return false;
  }
};

export const getBountyHunterMax = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): number => {
  if (parsedRepo && parsedRepo["max-concurrent-assigns"] && !Number.isNaN(Number(parsedRepo["max-concurrent-assigns"]))) {
    return Number(parsedRepo["max-concurrent-assigns"]);
  } else if (parsedOrg && parsedOrg["max-concurrent-assigns"] && !Number.isNaN(Number(parsedOrg["max-concurrent-assigns"]))) {
    return Number(parsedOrg["max-concurrent-assigns"]);
  } else {
    return 2;
  }
};

export const getDefaultLabels = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): string[] => {
  if (parsedRepo && parsedRepo["default-labels"]) {
    return parsedRepo["default-labels"];
  } else if (parsedOrg && parsedOrg["default-labels"]) {
    return parsedOrg["default-labels"];
  } else {
    return [];
  }
};
