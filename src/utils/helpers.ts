import { CommentElementPricing } from "../types";
import { LabelConfig, ImportedConfigurations } from "./private.d";
import { defaultConfiguration } from "./private";

// These are the key names of the properties inside of the configuration.
// They are used to get the values from the configuration.
// The name of each type expresses the type of the value that is expected to be returned.

type getsNumber = "evm-network-id" | "base-multiplier" | "issue-creator-multiplier" | "max-concurrent-bounties";
type getsString = "promotion-comment";
type getsBoolean = "auto-pay-mode" | "analytics-mode" | "incentive-mode";
type getsArrayOfStrings = "default-labels";
type getsCommentElementPricing = "comment-element-pricing";
type getsLabels = "time-labels" | "priority-labels";

export const fromConfig = {
  getNumber: function getNumberFromConfig(key: getsNumber, { repository, organization }: ImportedConfigurations): number {
    if (repository && repository[key] && !Number.isNaN(repository[key])) {
      return Number(repository[key]);
    } else if (organization && organization[key] && !Number.isNaN(organization[key])) {
      return Number(organization[key]);
    } else {
      console.error(`config parser: "${key}" from imported configs failed to parse as Number`);
      return Number(defaultConfiguration[key]);
    }
  },
  getLabels: function getLabelsFromConfig(key: getsLabels, { repository, organization }: ImportedConfigurations): LabelConfig[] {
    if (repository && repository[key] && Array.isArray(repository[key]) && repository[key].length > 0) {
      return repository[key];
    } else if (organization && organization[key] && Array.isArray(organization[key]) && organization[key].length > 0) {
      return organization[key];
    } else {
      console.error(`config parser: "${key}" from imported configs failed to parse as Labels`);
      return defaultConfiguration[key];
    }
  },
  getCommentItemPrice: function getCommentItemPriceFromConfig(
    key: getsCommentElementPricing,
    { repository, organization }: ImportedConfigurations
  ): CommentElementPricing {
    if (repository && repository[key]) {
      return repository[key];
    } else if (organization && organization[key]) {
      return organization[key];
    } else {
      console.error(`config parser: "${key}" from imported configs failed to parse as CommentItemPrice`);
      return defaultConfiguration[key];
    }
  },
  getBoolean: function getBooleanFromConfig(key: getsBoolean, { repository, organization }: ImportedConfigurations): boolean {
    if (repository && repository[key] && typeof repository[key] === "boolean") {
      return repository[key];
    } else if (organization && organization[key] && typeof organization[key] === "boolean") {
      return organization[key];
    } else {
      console.error(`config parser: "${key}" from imported configs failed to parse as Boolean`);
      return defaultConfiguration[key];
    }
  },
  getString: function getStringFromConfig(key: getsString, { repository, organization }: ImportedConfigurations): string {
    if (repository && repository[key] && typeof repository[key] === "string") {
      return repository[key];
    } else if (organization && organization[key] && typeof organization[key] === "string") {
      return organization[key];
    } else {
      console.error(`config parser: "${key}" from imported configs failed to parse as String`);
      return defaultConfiguration[key];
    }
  },
  getStrings: function getStringsFromConfig(key: getsArrayOfStrings, { repository, organization }: ImportedConfigurations): string[] {
    if (repository && repository[key]) {
      return repository[key];
    } else if (organization && organization[key]) {
      return organization[key];
    } else {
      console.error(`config parser: "${key}" from imported configs failed to parse as Strings`);
      return defaultConfiguration[key];
    }
  },
};
