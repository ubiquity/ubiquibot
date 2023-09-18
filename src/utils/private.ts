import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { MergedConfig, Payload } from "../types";
import { Context } from "probot";
import merge from "lodash/merge";

import { DefaultConfig } from "../configs";
import { validate } from "./ajv";
import { WideConfig, WideOrgConfig, WideRepoConfig, WideConfigSchema, WideOrgConfigSchema } from "../types";

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

export interface MergedConfigs {
  parsedRepo: WideRepoConfig | undefined;
  parsedOrg: WideOrgConfig | undefined;
  parsedDefault: MergedConfig;
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

export const getOrgAndRepoFromPath = (path: string) => {
  const parts = path.split("/");

  if (parts.length !== 2) {
    return { org: null, repo: null };
  }

  const [org, repo] = parts;

  return { org, repo };
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

const mergeConfigs = (configs: MergedConfigs) => {
  return merge({}, configs.parsedDefault, configs.parsedOrg, configs.parsedRepo);
};

export const getWideConfig = async (context: Context) => {
  const orgConfig = await getConfigSuperset(context, "org", CONFIG_PATH);
  const repoConfig = await getConfigSuperset(context, "repo", CONFIG_PATH);

  const parsedOrg: WideOrgConfig | undefined = parseYAML(orgConfig);

  if (parsedOrg) {
    const { valid, error } = validate(WideOrgConfigSchema, parsedOrg);
    if (!valid) {
      throw new Error(`Invalid org config: ${error}`);
    }
  }
  const parsedRepo: WideRepoConfig | undefined = parseYAML(repoConfig);
  if (parsedRepo) {
    const { valid, error } = validate(WideConfigSchema, parsedRepo);
    if (!valid) {
      throw new Error(`Invalid repo config: ${error}`);
    }
  }
  const parsedDefault: MergedConfig = DefaultConfig;
  const privateKeyDecrypted = parsedOrg && parsedOrg[KEY_NAME] ? await getPrivateKey(parsedOrg[KEY_NAME]) : undefined;

  const configs: MergedConfigs = { parsedDefault, parsedOrg, parsedRepo };
  const mergedConfigData: MergedConfig = mergeConfigs(configs);

  const configData = {
    networkId: mergedConfigData["evm-network-id"],
    privateKey: privateKeyDecrypted ?? "",
    assistivePricing: mergedConfigData["assistive-pricing"],
    commandSettings: mergedConfigData["command-settings"],
    baseMultiplier: mergedConfigData["price-multiplier"],
    issueCreatorMultiplier: mergedConfigData["issue-creator-multiplier"],
    timeLabels: mergedConfigData["time-labels"],
    priorityLabels: mergedConfigData["priority-labels"],
    paymentPermitMaxPrice: mergedConfigData["payment-permit-max-price"],
    disableAnalytics: mergedConfigData["disable-analytics"],
    bountyHunterMax: mergedConfigData["max-concurrent-assigns"],
    incentiveMode: mergedConfigData["comment-incentives"],
    incentives: mergedConfigData["incentives"],
    defaultLabels: mergedConfigData["default-labels"],
    promotionComment: mergedConfigData["promotion-comment"],
    registerWalletWithVerification: mergedConfigData["register-wallet-with-verification"],
    enableAccessControl: mergedConfigData["enable-access-control"],
    staleBountyTime: mergedConfigData["stale-bounty-time"],
  };

  return configData;
};
