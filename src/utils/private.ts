import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { Payload } from "../types";
import { Context } from "probot";

import DEFAULT_CONFIG_JSON from "../../ubiquibot-config-default.json";
import { fromConfig as config } from "./helpers";

const CONFIG_REPO = "ubiquibot-config";
const CONFIG_PATH = ".github/ubiquibot-config.yml";
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

export interface Label {
  name: string;
  weight: number;
  value?: number | undefined;
}

export interface CommandsConfiguration {
  name: string;
  enabled: boolean;
}

export type RepositoryConfiguration = {
  "auto-pay-mode"?: boolean;
  "analytics-mode"?: boolean;
  "incentive-mode"?: boolean;
  "evm-network-id"?: number;
  "price-multiplier"?: number;
  "issue-creator-multiplier"?: number;
  "time-labels"?: Label[];
  "priority-labels"?: Label[];
  "payment-permit-max-price"?: number;
  "command-settings"?: CommandsConfiguration[];
  "promotion-comment"?: string;
  "disable-analytics"?: boolean;
  "comment-incentives"?: boolean;
  "assistive-pricing"?: boolean;
  "max-concurrent-assigns"?: number;
  "comment-element-pricing"?: Record<keyof (typeof DEFAULT_CONFIG_JSON)["comment-element-pricing"], number>;
  "default-labels"?: string[];
  "register-wallet-with-verification"?: boolean;
  "base-multiplier"?: number;
};
export interface OrganizationConfiguration extends RepositoryConfiguration {
  "private-key-encrypted"?: string;
}

export const parseYAML = (data?: string): RepositoryConfiguration | undefined => {
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

export const getAllConfigs = async (context: Context) => {
  const orgConfig = await getConfigSuperset(context, "org", CONFIG_PATH);
  const repoConfig = await getConfigSuperset(context, "repo", CONFIG_PATH);

  const parsedOrg: OrganizationConfiguration | undefined = parseYAML(orgConfig);
  const parsedRepo: RepositoryConfiguration | undefined = parseYAML(repoConfig);
  const parsedDefault: RepositoryConfiguration = DEFAULT_CONFIG_JSON;
  const privateKeyDecrypted = parsedOrg && parsedOrg[KEY_NAME] ? await getPrivateKey(parsedOrg[KEY_NAME]) : undefined;

  const configs = {
    repository: parsedRepo,
    organization: parsedOrg,
    fallback: parsedDefault,
  };

  const configData = {
    // privateKey: organization && organization[PRIVATE_KEY_NAME] ? await getPrivateKey(organization[PRIVATE_KEY_NAME]) : "",
    privateKey: privateKeyDecrypted ?? "",

    evmNetworkId: config.getNumber("evm-network-id", configs),
    assistivePricing: config.getBoolean("assistive-pricing", configs),
    commandSettings: config.getCommandSettings("command-settings", configs),
    baseMultiplier: config.getNumber("base-multiplier", configs),
    issueCreatorMultiplier: config.getNumber("issue-creator-multiplier", configs),
    timeLabels: config.getLabels("time-labels", configs),
    priorityLabels: config.getLabels("priority-labels", configs),
    paymentPermitMaxPrice: config.getNumber("payment-permit-max-price", configs),
    disableAnalytics: config.getBoolean("disable-analytics", configs),
    maxConcurrentAssigns: config.getNumber("max-concurrent-assigns", configs),
    incentiveMode: config.getBoolean("incentive-mode", configs),
    commentElementPricing: config.getCommentItemPrice("comment-element-pricing", configs),
    defaultLabels: config.getStrings("default-labels", configs),
    promotionComment: config.getString("promotion-comment", configs),
    registerWalletWithVerification: config.getBoolean("register-wallet-with-verification", configs),
  };

  return configData;
};

// {
//   repository: RepositoryConfiguration | undefined;
//   organization: OrganizationConfiguration | undefined;
//   defaultConfiguration: RepositoryConfiguration;
// }
