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
  getNetworkId,
  getPriorityLabels,
  getTimeLabels,
  getCommentItemPrice,
  getDefaultLabels,
  getPromotionComment,
  getRegisterWalletWithVerification,
} from "./helpers";

const CONFIG_REPO = "ubiquibot-config";
const CONFIG_PATH = ".github/ubiquibot-config.yml";
const DEFAULT_CONFIG_PATH = "./ubiquibot-config-default.yml";
const KEY_NAME = "private-key-encrypted";
const KEY_PREFIX = "HSK_";

export const getConfigSuperset = async (context: Context, type: "org" | "repo", filePath: string): Promise<string | undefined> => {
  try {
    const payload = context.payload as Payload;
    const repo = type === "org" ? CONFIG_REPO : payload.repository.name;
    const owner = type === "org" ? payload.organization?.login : payload.repository.owner.login;
    if (!repo || !owner) return undefined;
    const { data } = await context.octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      mediaType: {
        format: "raw",
      },
    });
    return data as unknown as string;
  } catch (error: unknown) {
    return undefined;
  }
};

export interface WideLabel {
  name: string;
  weight: number;
  value?: number | undefined;
}

export interface WideConfig {
  "evm-network-id"?: number;
  "price-multiplier"?: number;
  "issue-creator-multiplier": number;
  "time-labels"?: WideLabel[];
  "priority-labels"?: WideLabel[];
  "auto-pay-mode"?: boolean;
  "promotion-comment"?: string;
  "disable-analytics"?: boolean;
  "comment-incentives"?: boolean;
  "max-concurrent-assigns"?: number;
  "comment-element-pricing"?: Record<string, number>;
  "default-labels"?: string[];
  "register-wallet-with-verification"?: boolean;
}

export type WideRepoConfig = WideConfig;

export interface WideOrgConfig extends WideConfig {
  "private-key-encrypted"?: string;
}

export const parseYAML = (data?: string): WideConfig | undefined => {
  try {
    if (data) {
      const parsedData = YAML.parse(data);
      return parsedData ?? undefined;
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
};

export const getDefaultConfig = (): WideRepoConfig => {
  const defaultConfig = readFileSync(`${__dirname}/../../ubiquibot-config-default.yml`, "utf8");
  return parseYAML(defaultConfig) as WideRepoConfig;
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    return undefined;
  }
};

export const getWideConfig = async (context: Context) => {
  const orgConfig = await getConfigSuperset(context, "org", CONFIG_PATH);
  const repoConfig = await getConfigSuperset(context, "repo", CONFIG_PATH);

  const parsedOrg: WideOrgConfig | undefined = parseYAML(orgConfig);
  const parsedRepo: WideRepoConfig | undefined = parseYAML(repoConfig);
  const defaultConfig = await getConfigSuperset(context, "repo", DEFAULT_CONFIG_PATH);
  const parsedDefault: WideRepoConfig | undefined = parseYAML(defaultConfig);
  if (!parsedDefault) {
    throw new Error("Default configuration missing!");
  }
  const privateKeyDecrypted = parsedOrg && parsedOrg[KEY_NAME] ? await getPrivateKey(parsedOrg[KEY_NAME]) : undefined;

  const configs = { parsedRepo, parsedOrg, parsedDefault };
  const configData = {
    networkId: getNetworkId(configs),
    privateKey: privateKeyDecrypted ?? "",
    baseMultiplier: getBaseMultiplier(configs),
    issueCreatorMultiplier: getCreatorMultiplier(configs),
    timeLabels: getTimeLabels(configs),
    priorityLabels: getPriorityLabels(configs),
    autoPayMode: getAutoPayMode(configs),
    disableAnalytics: getAnalyticsMode(configs),
    bountyHunterMax: getBountyHunterMax(configs),
    incentiveMode: getIncentiveMode(configs),
    commentElementPricing: getCommentItemPrice(configs),
    defaultLabels: getDefaultLabels(configs),
    promotionComment: getPromotionComment(configs),
    registerWalletWithVerification: getRegisterWalletWithVerification(configs),
  };

  return configData;
};
