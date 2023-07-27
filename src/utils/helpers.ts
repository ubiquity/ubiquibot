import { CommentElementPricing } from "../types";
import { ConfigLabel, ConfigOrganization, ConfigRepository, Config } from "./private";
interface Configs {
  parsedRepo?: ConfigRepository;
  parsedOrg?: ConfigOrganization;
  parsedDefault: ConfigRepository;
}
type getsNumber = "evm-network-id" | "base-multiplier" | "issue-creator-multiplier" | "max-concurrent-bounties";
type getsString = "promotion-comment";
type getsBoolean = "auto-pay-mode" | "analytics-mode" | "incentive-mode";
type getsArrayOfStrings = "default-labels";
type getsCommentElementPricing = "comment-element-pricing";
type getsLabels = "time-labels" | "priority-labels";

export const getNumber = (key: getsNumber, { parsedRepo, parsedOrg, parsedDefault }: Configs): number => {
  if (parsedRepo && parsedRepo[key] && !Number.isNaN(Number(parsedRepo[key]))) {
    return Number(parsedRepo[key]);
  } else if (parsedOrg && parsedOrg[key] && !Number.isNaN(Number(parsedOrg[key]))) {
    return Number(parsedOrg[key]);
  } else {
    return Number(parsedDefault[key] || Config[key]);
  }
};
export const getLabels = (key: getsLabels, { parsedRepo, parsedOrg }: Configs): ConfigLabel[] => {
  if (parsedRepo && parsedRepo[key] && Array.isArray(parsedRepo[key]) && parsedRepo[key].length > 0) {
    return parsedRepo[key];
  } else if (parsedOrg && parsedOrg[key] && Array.isArray(parsedOrg[key]) && parsedOrg[key].length > 0) {
    return parsedOrg[key];
  } else {
    return Config[key];
  }
};
export const getCommentItemPrice = (key: getsCommentElementPricing, { parsedRepo, parsedOrg, parsedDefault }: Configs): CommentElementPricing => {
  if (parsedRepo && parsedRepo[key]) {
    return parsedRepo[key];
  } else if (parsedOrg && parsedOrg[key]) {
    return parsedOrg[key];
  } else {
    return parsedDefault[key] || Config[key];
  }
};
export const getBoolean = (key: getsBoolean, { parsedRepo, parsedOrg, parsedDefault }: Configs): boolean => {
  if (parsedRepo && parsedRepo[key] && typeof parsedRepo[key] === "boolean") {
    return parsedRepo[key];
  } else if (parsedOrg && parsedOrg[key] && typeof parsedOrg[key] === "boolean") {
    return parsedOrg[key];
  } else {
    return parsedDefault[key] || Config[key];
  }
};
export const getString = (key: getsString, { parsedRepo, parsedOrg, parsedDefault }: Configs): string => {
  if (parsedRepo && parsedRepo[key] && typeof parsedRepo[key] === "string") {
    return parsedRepo[key];
  } else if (parsedOrg && parsedOrg[key] && typeof parsedOrg[key] === "string") {
    return parsedOrg[key];
  } else {
    return parsedDefault[key] || Config[key];
  }
};
export const getStrings = (key: getsArrayOfStrings, { parsedRepo, parsedOrg, parsedDefault }: Configs): string[] => {
  if (parsedRepo && parsedRepo[key]) {
    return parsedRepo[key];
  } else if (parsedOrg && parsedOrg[key]) {
    return parsedOrg[key];
  } else {
    return parsedDefault[key] || Config[key];
  }
};
