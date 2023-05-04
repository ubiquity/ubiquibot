import { DefaultPriceConfig } from "../configs";
import { WideLabel, WideOrgConfig, WideRepoConfig } from "./private";

export const getBaseMultiplier = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): number => {
  if (parsedRepo && parsedRepo["baseMultiplier"] && !Number.isNaN(Number(parsedRepo["baseMultiplier"]))) {
    return Number(parsedRepo["baseMultiplier"]);
  } else if (parsedOrg && parsedOrg["baseMultiplier"] && !Number.isNaN(Number(parsedOrg["baseMultiplier"]))) {
    return Number(parsedOrg["baseMultiplier"]);
  } else {
    return Number(DefaultPriceConfig["baseMultiplier"]);
  }
};

export const getTimeLabels = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): WideLabel[] => {
  if (parsedRepo && parsedRepo["timeLabels"] && Array.isArray(parsedRepo["timeLabels"]) && parsedRepo["timeLabels"].length > 0) {
    return parsedRepo["timeLabels"];
  } else if (parsedOrg && parsedOrg["timeLabels"] && Array.isArray(parsedOrg["timeLabels"]) && parsedOrg["timeLabels"].length > 0) {
    return parsedOrg["timeLabels"];
  } else {
    return DefaultPriceConfig["timeLabels"];
  }
};

export const getPriorityLabels = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): WideLabel[] => {
  if (parsedRepo && parsedRepo["priorityLabels"] && Array.isArray(parsedRepo["priorityLabels"]) && parsedRepo["priorityLabels"].length > 0) {
    return parsedRepo["priorityLabels"];
  } else if (parsedOrg && parsedOrg["priorityLabels"] && Array.isArray(parsedOrg["priorityLabels"]) && parsedOrg["priorityLabels"].length > 0) {
    return parsedOrg["priorityLabels"];
  } else {
    return DefaultPriceConfig["priorityLabels"];
  }
};

export const getAutoPayMode = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): boolean => {
  if (parsedRepo && parsedRepo["autoPayMode"] && typeof parsedRepo["autoPayMode"] === "boolean") {
    return parsedRepo["autoPayMode"];
  } else if (parsedOrg && parsedOrg["autoPayMode"] && typeof parsedOrg["autoPayMode"] === "boolean") {
    return parsedOrg["autoPayMode"];
  } else {
    return true;
  }
};

export const getAnalyticsMode = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): boolean => {
  if (parsedRepo && parsedRepo["analyticsMode"] && typeof parsedRepo["analyticsMode"] === "boolean") {
    return parsedRepo["analyticsMode"];
  } else if (parsedOrg && parsedOrg["analyticsMode"] && typeof parsedOrg["analyticsMode"] === "boolean") {
    return parsedOrg["analyticsMode"];
  } else {
    return false;
  }
};

export const getBountyHunterMax = (parsedRepo: WideRepoConfig | undefined, parsedOrg: WideOrgConfig | undefined): number => {
  if (parsedRepo && parsedRepo["bountyHunterMax"] && !Number.isNaN(Number(parsedRepo["bountyHunterMax"]))) {
    return Number(parsedRepo["bountyHunterMax"]);
  } else if (parsedOrg && parsedOrg["bountyHunterMax"] && !Number.isNaN(Number(parsedRepo!["bountyHunterMax"]))) {
    return Number(parsedOrg["bountyHunterMax"]);
  } else {
    return 2;
  }
};
