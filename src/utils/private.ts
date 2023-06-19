import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { Payload } from "../types";
import { Context } from "probot";
import { readFileSync } from "fs";
import {
  getAnalyticsMode,
  getAutoPayMode,
  getBaseMultiplier,
  getCreatorMultiplier,
  getBountyHunterMax,
  getIncentiveMode,
  getChainId,
  getPriorityLabels,
  getTimeLabels,
  getCommentItemPrice,
} from "./helpers";

const CONFIG_REPO = "ubiquibot-config";
const KEY_PATH = ".github/ubiquibot-config.yml";
const KEY_NAME = "private-key-encrypted";
const KEY_PREFIX = "HSK_";

export const getConfigSuperset = async (context: Context, type: "org" | "repo"): Promise<string | undefined> => {
  try {
    const payload = context.payload as Payload;
    const repo = type === "org" ? CONFIG_REPO : payload.repository.name!;
    const owner = type === "org" ? payload.organization?.login! : payload.repository.owner.login!;
    const { data } = await context.octokit.rest.repos.getContent({
      owner,
      repo: repo,
      path: KEY_PATH,
      mediaType: {
        format: "raw",
      },
    });
    return data as unknown as string;
  } catch (error: any) {
    return undefined;
  }
};

export interface WideLabel {
  name: string;
  weight: number;
  value?: number | undefined;
}

export interface WideConfig {
  "chain-id"?: number;
  "base-multiplier"?: number;
  "issue-creator-multiplier": number;
  "time-labels"?: WideLabel[];
  "priority-labels"?: WideLabel[];
  "auto-pay-mode"?: boolean;
  "analytics-mode"?: boolean;
  "incentive-mode"?: boolean;
  "max-concurrent-bounties"?: number;
  "comment-element-pricing"?: Record<string, number>;
}

export interface WideRepoConfig extends WideConfig {}

export interface WideOrgConfig extends WideConfig {
  "private-key-encrypted"?: string;
}

export const parseYAML = (data: any): any | undefined => {
  try {
    const parsedData = YAML.parse(data);
    if (parsedData !== null) {
      return parsedData;
    } else {
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
};

export const getDefaultConfig = (): WideRepoConfig => {
  const defaultConfig = readFileSync(`${__dirname}/../../ubiquibot-config-default.yml`, "utf8");
  return parseYAML(defaultConfig);
};

export const getPrivateKey = async (cipherText: string): Promise<string | undefined> => {
  try {
    await _sodium.ready;
    const sodium = _sodium;

    const privateKey = process.env.X25519_PRIVATE_KEY;
    const publicKey = await getScalarKey(privateKey);

    if (!publicKey || !privateKey) {
      return undefined;
    }

    const binPub = sodium.from_base64(publicKey, sodium.base64_variants.URLSAFE_NO_PADDING);
    const binPriv = sodium.from_base64(privateKey, sodium.base64_variants.URLSAFE_NO_PADDING);
    const binCipher = sodium.from_base64(cipherText, sodium.base64_variants.URLSAFE_NO_PADDING);

    let walletPrivateKey: string | undefined = sodium.crypto_box_seal_open(binCipher, binPub, binPriv, "text");
    walletPrivateKey = walletPrivateKey.replace(KEY_PREFIX, "");
    return walletPrivateKey;
  } catch (error: any) {
    return undefined;
  }
};

export const getScalarKey = async (X25519_PRIVATE_KEY: string | undefined): Promise<string | undefined> => {
  try {
    if (X25519_PRIVATE_KEY !== undefined) {
      await _sodium.ready;
      const sodium = _sodium;

      const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
      const scalerPub = sodium.crypto_scalarmult_base(binPriv, "base64");
      return scalerPub;
    }
    return undefined;
  } catch (error: any) {
    return undefined;
  }
};

export const getWideConfig = async (context: Context) => {
  const orgConfig = await getConfigSuperset(context, "org");
  const repoConfig = await getConfigSuperset(context, "repo");

  const parsedOrg: WideOrgConfig | undefined = parseYAML(orgConfig);
  const parsedRepo: WideRepoConfig | undefined = parseYAML(repoConfig);
  const parsedDefault: WideRepoConfig = getDefaultConfig();
  const privateKeyDecrypted = parsedOrg && parsedOrg[KEY_NAME] ? await getPrivateKey(parsedOrg[KEY_NAME]) : undefined;

  const configs = { parsedRepo, parsedOrg, parsedDefault };
  const configData = {
    chainId: getChainId(configs),
    privateKey: privateKeyDecrypted ?? "",
    baseMultiplier: getBaseMultiplier(configs),
    issueCreatorMultiplier: getCreatorMultiplier(configs),
    timeLabels: getTimeLabels(configs),
    priorityLabels: getPriorityLabels(configs),
    autoPayMode: getAutoPayMode(configs),
    analyticsMode: getAnalyticsMode(configs),
    bountyHunterMax: getBountyHunterMax(configs),
    incentiveMode: getIncentiveMode(configs),
    commentElementPricing: getCommentItemPrice(configs),
  };

  return configData;
};
