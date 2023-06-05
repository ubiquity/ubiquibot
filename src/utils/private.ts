import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { Payload } from "../types";
import { Context } from "probot";
import {
  getAnalyticsMode,
  getAutoPayMode,
  getBaseMultiplier,
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
    const { data } = await context.octokit.rest.repos.getContent({
      owner: payload.organization?.login!,
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
  const privateKeyDecrypted = parsedOrg && parsedOrg[KEY_NAME] ? await getPrivateKey(parsedOrg[KEY_NAME]) : undefined;

  const configData = {
    chainId: getChainId(parsedRepo, parsedOrg),
    privateKey: privateKeyDecrypted ?? "",
    baseMultiplier: getBaseMultiplier(parsedRepo, parsedOrg),
    timeLabels: getTimeLabels(parsedRepo, parsedOrg),
    priorityLabels: getPriorityLabels(parsedRepo, parsedOrg),
    autoPayMode: getAutoPayMode(parsedRepo, parsedOrg),
    analyticsMode: getAnalyticsMode(parsedRepo, parsedOrg),
    bountyHunterMax: getBountyHunterMax(parsedRepo, parsedOrg),
    incentiveMode: getIncentiveMode(parsedRepo, parsedOrg),
    commentElementPricing: getCommentItemPrice(parsedRepo, parsedOrg),
  };

  return configData;
};
