import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { Payload } from "../types";
import { Context } from "probot";
import { readFileSync } from "fs";
import { getBoolean, getCommentItemPrice, getLabels, getNumber, getString, getStrings } from "./helpers";

const CONFIG_REPO = "ubiquibot-config";
const KEY_PATH = ".github/ubiquibot-config.yml";
const KEY_NAME = "private-key-encrypted";
const KEY_PREFIX = "HSK_";

export const getConfigSuperset = async (context: Context, type: "org" | "repo"): Promise<string | undefined> => {
  try {
    const payload = context.payload as Payload;
    const repo = type === "org" ? CONFIG_REPO : payload.repository.name;
    const owner = type === "org" ? payload.organization?.login : payload.repository.owner.login;
    if (!repo || !owner) return undefined;
    const { data } = await context.octokit.rest.repos.getContent({
      owner,
      repo,
      path: KEY_PATH,
      mediaType: {
        format: "raw",
      },
    });
    return data as unknown as string;
  } catch (error: unknown) {
    return undefined;
  }
};

export interface ConfigLabel {
  name: string;
  weight: number;
  value?: number | undefined;
}

// defaults
export const Config = {
  "evm-network-id": 1,
  "base-multiplier": 0,
  "issue-creator-multiplier": 0,
  "time-labels": [],
  "priority-labels": [],
  "auto-pay-mode": false,
  "promotion-comment": `<h6>If you enjoy the DevPool experience, please follow <a href="https://github.com/ubiquity">Ubiquity on GitHub</a> and star <a href="https://github.com/ubiquity/devpool-directory">this repo</a> to show your support. It helps a lot!</h6>`,
  "analytics-mode": true,
  "incentive-mode": false,
  "max-concurrent-bounties": 0,
  "comment-element-pricing": {},
  "default-labels": [],
} as {
  "evm-network-id": number;
  "base-multiplier": number;
  "issue-creator-multiplier": number;
  "time-labels": ConfigLabel[];
  "priority-labels": ConfigLabel[];
  "auto-pay-mode": boolean;
  "promotion-comment": string;
  "analytics-mode": boolean;
  "incentive-mode": boolean;
  "max-concurrent-bounties": number;
  "comment-element-pricing": Record<string, number>;
  "default-labels": string[];
};

export type ConfigRepository = typeof Config;

export interface ConfigOrganization extends ConfigRepository {
  "private-key-encrypted"?: string;
}

export const parseYAML = (data?: string): ConfigRepository => {
  try {
    if (data) {
      const parsedData = YAML.parse(data);
      return parsedData;
    }
  } catch (error) {
    console.error(error);
  }
  return Config;
};

export const getDefaultConfig = (): ConfigRepository => {
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

export const getConfig = async (context: Context) => {
  const orgConfig = await getConfigSuperset(context, "org");
  const repoConfig = await getConfigSuperset(context, "repo");

  const parsedOrg: ConfigOrganization = parseYAML(orgConfig);
  const parsedRepo: ConfigRepository = parseYAML(repoConfig);
  const parsedDefault: ConfigRepository = getDefaultConfig();
  const privateKeyDecrypted = parsedOrg && parsedOrg[KEY_NAME] ? await getPrivateKey(parsedOrg[KEY_NAME]) : undefined;

  const configs = { parsedRepo, parsedOrg, parsedDefault };
  const configData = {
    privateKey: privateKeyDecrypted ?? "",

    evmNetworkId: getNumber("evm-network-id", configs),
    baseMultiplier: getNumber("base-multiplier", configs),
    issueCreatorMultiplier: getNumber("issue-creator-multiplier", configs),
    timeLabels: getLabels("time-labels", configs),
    priorityLabels: getLabels("priority-labels", configs),
    autoPayMode: getBoolean("auto-pay-mode", configs),
    analyticsMode: getBoolean("analytics-mode", configs),
    maxConcurrentBounties: getNumber("max-concurrent-bounties", configs),
    incentiveMode: getBoolean("incentive-mode", configs),
    commentElementPricing: getCommentItemPrice("comment-element-pricing", configs),
    defaultLabels: getStrings("default-labels", configs),
    promotionComment: getString("promotion-comment", configs),
  };

  return configData;
};
