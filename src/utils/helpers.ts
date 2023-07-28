import { CommentElementPricing } from "../types";
import { ConfigLabel, ConfigOrganization, ConfigRepository, Config } from "./private";

// These are the key names of the properties inside of the configuration.
// They are used to get the values from the configuration.
// The name of each type expresses the type of the value that is expected to be returned.

type getsNumber = "evm-network-id" | "base-multiplier" | "issue-creator-multiplier" | "max-concurrent-bounties";
type getsString = "promotion-comment";
type getsBoolean = "auto-pay-mode" | "analytics-mode" | "incentive-mode";
type getsArrayOfStrings = "default-labels";
type getsCommentElementPricing = "comment-element-pricing";
type getsLabels = "time-labels" | "priority-labels";

interface Configs {
  parsedRepo?: ConfigRepository;
  parsedOrg?: ConfigOrganization;
  parsedDefault: ConfigRepository;
}

export const fromConfig = {
  getNumber: function getNumberFromConfig(key: getsNumber, { parsedRepo, parsedOrg, parsedDefault }: Configs): number {
    if (parsedRepo && parsedRepo[key] && !Number.isNaN(Number(parsedRepo[key]))) {
      return Number(parsedRepo[key]);
    } else if (parsedOrg && parsedOrg[key] && !Number.isNaN(Number(parsedOrg[key]))) {
      return Number(parsedOrg[key]);
    } else {
      return Number(parsedDefault[key] || Config[key]);
    }
  },
  getLabels: function getLabelsFromConfig(key: getsLabels, { parsedRepo, parsedOrg }: Configs): ConfigLabel[] {
    if (parsedRepo && parsedRepo[key] && Array.isArray(parsedRepo[key]) && parsedRepo[key].length > 0) {
      return parsedRepo[key];
    } else if (parsedOrg && parsedOrg[key] && Array.isArray(parsedOrg[key]) && parsedOrg[key].length > 0) {
      return parsedOrg[key];
    } else {
      return Config[key];
    }
  },
  getCommentItemPrice: function getCommentItemPriceFromConfig(
    key: getsCommentElementPricing,
    { parsedRepo, parsedOrg, parsedDefault }: Configs
  ): CommentElementPricing {
    if (parsedRepo && parsedRepo[key]) {
      return parsedRepo[key];
    } else if (parsedOrg && parsedOrg[key]) {
      return parsedOrg[key];
    } else {
      return parsedDefault[key] || Config[key];
    }
  },
  getBoolean: function getBooleanFromConfig(key: getsBoolean, { parsedRepo, parsedOrg, parsedDefault }: Configs): boolean {
    if (parsedRepo && parsedRepo[key] && typeof parsedRepo[key] === "boolean") {
      return parsedRepo[key];
    } else if (parsedOrg && parsedOrg[key] && typeof parsedOrg[key] === "boolean") {
      return parsedOrg[key];
    } else {
      return parsedDefault[key] || Config[key];
    }
  },
  getString: function getStringFromConfig(key: getsString, { parsedRepo, parsedOrg, parsedDefault }: Configs): string {
    if (parsedRepo && parsedRepo[key] && typeof parsedRepo[key] === "string") {
      return parsedRepo[key];
    } else if (parsedOrg && parsedOrg[key] && typeof parsedOrg[key] === "string") {
      return parsedOrg[key];
    } else {
      return parsedDefault[key] || Config[key];
    }
  },
  getStrings: function getStringsFromConfig(key: getsArrayOfStrings, { parsedRepo, parsedOrg, parsedDefault }: Configs): string[] {
    if (parsedRepo && parsedRepo[key]) {
      return parsedRepo[key];
    } else if (parsedOrg && parsedOrg[key]) {
      return parsedOrg[key];
    } else {
      return parsedDefault[key] || Config[key];
    }
  },
};
