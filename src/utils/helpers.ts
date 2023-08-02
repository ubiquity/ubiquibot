import { CommentElementPricing } from "../types";
import { WideLabel, WideOrgConfig, WideRepoConfig } from "./private";

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
    return Number(parsedDefault["evm-network-id"]);
  }
};

export const getBaseMultiplier = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["price-multiplier"] && !Number.isNaN(Number(parsedRepo["price-multiplier"]))) {
    return Number(parsedRepo["price-multiplier"]);
  } else if (parsedOrg && parsedOrg["price-multiplier"] && !Number.isNaN(Number(parsedOrg["price-multiplier"]))) {
    return Number(parsedOrg["price-multiplier"]);
  } else {
    return Number(parsedDefault["price-multiplier"]);
  }
};

export const getCreatorMultiplier = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["issue-creator-multiplier"] && !Number.isNaN(Number(parsedRepo["issue-creator-multiplier"]))) {
    return Number(parsedRepo["issue-creator-multiplier"]);
  } else if (parsedOrg && parsedOrg["issue-creator-multiplier"] && !Number.isNaN(Number(parsedOrg["issue-creator-multiplier"]))) {
    return Number(parsedOrg["issue-creator-multiplier"]);
  } else {
    return Number(parsedDefault["issue-creator-multiplier"]);
  }
};

export const getTimeLabels = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): WideLabel[] => {
  if (parsedRepo && parsedRepo["time-labels"] && Array.isArray(parsedRepo["time-labels"]) && parsedRepo["time-labels"].length > 0) {
    return parsedRepo["time-labels"];
  } else if (parsedOrg && parsedOrg["time-labels"] && Array.isArray(parsedOrg["time-labels"]) && parsedOrg["time-labels"].length > 0) {
    return parsedOrg["time-labels"];
  } else {
    return parsedDefault["time-labels"] as WideLabel[];
  }
};

export const getPriorityLabels = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): WideLabel[] => {
  if (parsedRepo && parsedRepo["priority-labels"] && Array.isArray(parsedRepo["priority-labels"]) && parsedRepo["priority-labels"].length > 0) {
    return parsedRepo["priority-labels"];
  } else if (parsedOrg && parsedOrg["priority-labels"] && Array.isArray(parsedOrg["priority-labels"]) && parsedOrg["priority-labels"].length > 0) {
    return parsedOrg["priority-labels"];
  } else {
    return parsedDefault["priority-labels"] as WideLabel[];
  }
};

export const getCommentItemPrice = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): CommentElementPricing => {
  if (parsedRepo && parsedRepo["comment-element-pricing"]) {
    return parsedRepo["comment-element-pricing"];
  } else if (parsedOrg && parsedOrg["comment-element-pricing"]) {
    return parsedOrg["comment-element-pricing"];
  } else {
    return parsedDefault["comment-element-pricing"] as CommentElementPricing;
  }
};

export const getAutoPayMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["payment-permit-max-price"] && typeof parsedRepo["payment-permit-max-price"] === "boolean") {
    return Number(parsedRepo["payment-permit-max-price"]);
  } else if (parsedOrg && parsedOrg["payment-permit-max-price"] && typeof parsedOrg["payment-permit-max-price"] === "boolean") {
    return Number(parsedOrg["payment-permit-max-price"]);
  } else {
    return Number(parsedDefault["payment-permit-max-price"]);
  }
};

export const getAnalyticsMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["disable-analytics"] && typeof parsedRepo["disable-analytics"] === "boolean") {
    return parsedRepo["disable-analytics"];
  } else if (parsedOrg && parsedOrg["disable-analytics"] && typeof parsedOrg["disable-analytics"] === "boolean") {
    return parsedOrg["disable-analytics"];
  } else {
    return parsedDefault["disable-analytics"] as boolean;
  }
};

export const getPromotionComment = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): string => {
  if (parsedRepo && parsedRepo["promotion-comment"] && typeof parsedRepo["promotion-comment"] === "string") {
    return parsedRepo["promotion-comment"];
  } else if (parsedOrg && parsedOrg["promotion-comment"] && typeof parsedOrg["promotion-comment"] === "string") {
    return parsedOrg["promotion-comment"];
  } else {
    return parsedDefault["promotion-comment"] as string;
  }
};

export const getIncentiveMode = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["comment-incentives"] && typeof parsedRepo["comment-incentives"] === "boolean") {
    return parsedRepo["comment-incentives"];
  } else if (parsedOrg && parsedOrg["comment-incentives"] && typeof parsedOrg["comment-incentives"] === "boolean") {
    return parsedOrg["comment-incentives"];
  } else {
    return parsedDefault["comment-incentives"] as boolean;
  }
};

export const getBountyHunterMax = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo["max-concurrent-assigns"] && !Number.isNaN(Number(parsedRepo["max-concurrent-assigns"]))) {
    return Number(parsedRepo["max-concurrent-assigns"]);
  } else if (parsedOrg && parsedOrg["max-concurrent-assigns"] && !Number.isNaN(Number(parsedOrg["max-concurrent-assigns"]))) {
    return Number(parsedOrg["max-concurrent-assigns"]);
  } else {
    return Number(parsedDefault["max-concurrent-assigns"]);
  }
};

export const getDefaultLabels = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): string[] => {
  if (parsedRepo && parsedRepo["default-labels"]) {
    return parsedRepo["default-labels"];
  } else if (parsedOrg && parsedOrg["default-labels"]) {
    return parsedOrg["default-labels"];
  } else {
    return parsedDefault["default-labels"] as string[];
  }
};

export const getRegisterWalletWithVerification = ({ parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo["register-wallet-with-verification"] && typeof parsedRepo["register-wallet-with-verification"] === "boolean") {
    return Boolean(parsedRepo["register-wallet-with-verification"]);
  } else if (parsedOrg && parsedOrg["register-wallet-with-verification"] && typeof parsedOrg["register-wallet-with-verification"] === "boolean") {
    return Boolean(parsedOrg["register-wallet-with-verification"]);
  } else {
    return Boolean(parsedDefault["register-wallet-with-verification"]);
  }
};
