import { CommentElementPricing } from "../types";
import { CommandObj, WideLabel, WideOrgConfig, WideRepoConfig } from "./private";

interface Configs {
  parsedRepo?: WideRepoConfig;
  parsedOrg?: WideOrgConfig;
  parsedDefault: WideRepoConfig;
}

export const getNetworkId = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["evm-network-id"] !== undefined && !Number.isNaN(Number(parsedRepo["evm-network-id"]))) {
    return Number(parsedRepo["evm-network-id"]);
  } else if (parsedOrg && parsedOrg["evm-network-id"] !== undefined && !Number.isNaN(Number(parsedOrg["evm-network-id"]))) {
    return Number(parsedOrg["evm-network-id"]);
  } else {
    return Number(parsedDefault["evm-network-id"]);
  }
};

export const getBaseMultiplier = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["price-multiplier"] !== undefined && !Number.isNaN(Number(parsedRepo["price-multiplier"]))) {
    return Number(parsedRepo["price-multiplier"]);
  } else if (parsedOrg && parsedOrg["price-multiplier"] !== undefined && !Number.isNaN(Number(parsedOrg["price-multiplier"]))) {
    return Number(parsedOrg["price-multiplier"]);
  } else {
    return Number(parsedDefault["price-multiplier"]);
  }
};

export const getCreatorMultiplier = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["issue-creator-multiplier"] !== undefined && !Number.isNaN(Number(parsedRepo["issue-creator-multiplier"]))) {
    return Number(parsedRepo["issue-creator-multiplier"]);
  } else if (parsedOrg && parsedOrg["issue-creator-multiplier"] !== undefined && !Number.isNaN(Number(parsedOrg["issue-creator-multiplier"]))) {
    return Number(parsedOrg["issue-creator-multiplier"]);
  } else {
    return Number(parsedDefault["issue-creator-multiplier"]);
  }
};

export const getTimeLabels = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): WideLabel[] => {
  if (parsedRepo && parsedRepo["time-labels"] !== undefined && Array.isArray(parsedRepo["time-labels"]) && parsedRepo["time-labels"].length > 0) {
    return parsedRepo["time-labels"];
  } else if (parsedOrg && parsedOrg["time-labels"] !== undefined && Array.isArray(parsedOrg["time-labels"]) && parsedOrg["time-labels"].length > 0) {
    return parsedOrg["time-labels"];
  } else {
    return parsedDefault["time-labels"] as WideLabel[];
  }
};

export const getCommandSettings = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): CommandObj[] => {
  if (parsedRepo && parsedRepo["command-settings"] && Array.isArray(parsedRepo["command-settings"]) && parsedRepo["command-settings"].length > 0) {
    return parsedRepo["command-settings"];
  } else if (parsedOrg && parsedOrg["command-settings"] && Array.isArray(parsedOrg["command-settings"]) && parsedOrg["command-settings"].length > 0) {
    return parsedOrg["command-settings"];
  } else {
    return parsedDefault["command-settings"] as CommandObj[];
  }
};

export const getPriorityLabels = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): WideLabel[] => {
  if (parsedRepo && parsedRepo["priority-labels"] !== undefined && Array.isArray(parsedRepo["priority-labels"]) && parsedRepo["priority-labels"].length > 0) {
    return parsedRepo["priority-labels"];
  } else if (
    parsedOrg &&
    parsedOrg["priority-labels"] !== undefined &&
    Array.isArray(parsedOrg["priority-labels"]) &&
    parsedOrg["priority-labels"].length > 0
  ) {
    return parsedOrg["priority-labels"];
  } else {
    return parsedDefault["priority-labels"] as WideLabel[];
  }
};

export const getCommentItemPrice = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): CommentElementPricing => {
  if (parsedRepo && parsedRepo["comment-element-pricing"] !== undefined) {
    return parsedRepo["comment-element-pricing"];
  } else if (parsedOrg && parsedOrg["comment-element-pricing"] !== undefined) {
    return parsedOrg["comment-element-pricing"];
  } else {
    return parsedDefault["comment-element-pricing"] as CommentElementPricing;
  }
};

export const getAutoPayMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["auto-pay-mode"] !== undefined && typeof parsedRepo["auto-pay-mode"] === "boolean") {
    return parsedRepo["auto-pay-mode"];
  } else if (parsedOrg && parsedOrg["auto-pay-mode"] !== undefined && typeof parsedOrg["auto-pay-mode"] === "boolean") {
    return parsedOrg["auto-pay-mode"];
  } else {
    return parsedDefault["auto-pay-mode"] as boolean;
  }
};

export const getAssistivePricing = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["assistive-pricing"] && typeof parsedRepo["assistive-pricing"] === "boolean") {
    return parsedRepo["assistive-pricing"];
  } else if (parsedOrg && parsedOrg["assistive-pricing"] && typeof parsedOrg["assistive-pricing"] === "boolean") {
    return parsedOrg["assistive-pricing"];
  } else {
    return parsedDefault["assistive-pricing"] as boolean;
  }
};

export const getAnalyticsMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["disable-analytics"] !== undefined && typeof parsedRepo["disable-analytics"] === "boolean") {
    return parsedRepo["disable-analytics"];
  } else if (parsedOrg && parsedOrg["disable-analytics"] !== undefined && typeof parsedOrg["disable-analytics"] === "boolean") {
    return parsedOrg["disable-analytics"];
  } else {
    return parsedDefault["disable-analytics"] as boolean;
  }
};

export const getPromotionComment = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): string => {
  if (parsedRepo && parsedRepo["promotion-comment"] !== undefined && typeof parsedRepo["promotion-comment"] === "string") {
    return parsedRepo["promotion-comment"];
  } else if (parsedOrg && parsedOrg["promotion-comment"] !== undefined && typeof parsedOrg["promotion-comment"] === "string") {
    return parsedOrg["promotion-comment"];
  } else {
    return parsedDefault["promotion-comment"] as string;
  }
};

export const getIncentiveMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["comment-incentives"] !== undefined && typeof parsedRepo["comment-incentives"] === "boolean") {
    return parsedRepo["comment-incentives"];
  } else if (parsedOrg && parsedOrg["comment-incentives"] !== undefined && typeof parsedOrg["comment-incentives"] === "boolean") {
    return parsedOrg["comment-incentives"];
  } else {
    return parsedDefault["comment-incentives"] as boolean;
  }
};

export const getBountyHunterMax = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["max-concurrent-assigns"] !== undefined && !Number.isNaN(Number(parsedRepo["max-concurrent-assigns"]))) {
    return Number(parsedRepo["max-concurrent-assigns"]);
  } else if (parsedOrg && parsedOrg["max-concurrent-assigns"] !== undefined && !Number.isNaN(Number(parsedOrg["max-concurrent-assigns"]))) {
    return Number(parsedOrg["max-concurrent-assigns"]);
  } else {
    return Number(parsedDefault["max-concurrent-assigns"]);
  }
};

export const getDefaultLabels = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): string[] => {
  if (parsedRepo && parsedRepo["default-labels"] !== undefined) {
    return parsedRepo["default-labels"];
  } else if (parsedOrg && parsedOrg["default-labels"] !== undefined) {
    return parsedOrg["default-labels"];
  } else {
    return parsedDefault["default-labels"] as string[];
  }
};

export const getRegisterWalletWithVerification = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["register-wallet-with-verification"] !== undefined && typeof parsedRepo["register-wallet-with-verification"] === "boolean") {
    return Boolean(parsedRepo["register-wallet-with-verification"]);
  } else if (parsedOrg && parsedOrg["register-wallet-with-verification"] !== undefined && typeof parsedOrg["register-wallet-with-verification"] === "boolean") {
    return Boolean(parsedOrg["register-wallet-with-verification"]);
  } else {
    return Boolean(parsedDefault["register-wallet-with-verification"]);
  }
};
