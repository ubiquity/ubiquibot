import sodium from "libsodium-wrappers";
import merge from "lodash/merge";
import { Context } from "probot";
import YAML from "yaml";
import { MergedConfig, Payload } from "../types";

import Runtime from "../bindings/bot-runtime";
import { DefaultConfig } from "../configs";
import { upsertLastCommentToIssue } from "../helpers/issue";
import { ConfigSchema } from "../types";
import { validate } from "./ajv";
import { Config } from "../types/config";

const CONFIG_REPO = "ubiquibot-config";
const CONFIG_PATH = ".github/ubiquibot-config.yml";
const KEY_NAME = "privateKeyEncrypted";
const KEY_PREFIX = "HSK_";

export async function getConfigSuperset(context: Context, type: "org" | "repo", filePath: string) {
  try {
    const payload = context.payload as Payload;
    const repo = type === "org" ? CONFIG_REPO : payload.repository.name;
    const owner = type === "org" ? payload.organization?.login : payload.repository.owner.login;
    if (!repo || !owner) return null;
    const { data } = await context.octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      mediaType: {
        format: "raw",
      },
    });
    return data;
  } catch (error: unknown) {
    return null;
  }
}

export interface MergedConfigs {
  parsedRepo: Config | null;
  parsedOrg: Config | null;
  parsedDefault: MergedConfig;
}

export function parseYAML(data?: string) {
  try {
    if (data) {
      const parsedData = YAML.parse(data) as Config;
      return parsedData ?? null;
    }
  } catch (error) {
    const logger = Runtime.getState().logger;
    logger.error("Failed to parse YAML", { error });
  }
  return null;
}

export const getOrgAndRepoFromPath = (path: string) => {
  const parts = path.split("/");

  if (parts.length !== 2) {
    return { org: null, repo: null };
  }

  const [org, repo] = parts;

  return { org, repo };
};

export async function getPrivateAndPublicKeys(
  cipherText: string,
  keys: { private: string | null; public: string | null }
) {
  const logger = Runtime.getState().logger;
  await sodium.ready;

  const X25519_PRIVATE_KEY = process.env.X25519_PRIVATE_KEY;
  if (!X25519_PRIVATE_KEY) {
    return logger.warn("X25519_PRIVATE_KEY is not defined");
  }
  keys.public = await getScalarKey(X25519_PRIVATE_KEY);
  if (!keys.public) {
    return logger.warn("Public key is null");
  }
  const binPub = sodium.from_base64(keys.public, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binCipher = sodium.from_base64(cipherText, sodium.base64_variants.URLSAFE_NO_PADDING);

  const walletPrivateKey: string | null = sodium.crypto_box_seal_open(binCipher, binPub, binPriv, "text");
  keys.private = walletPrivateKey?.replace(KEY_PREFIX, "");

  return keys;
}

export async function getScalarKey(X25519_PRIVATE_KEY: string) {
  const logger = Runtime.getState().logger;
  if (X25519_PRIVATE_KEY !== null) {
    await sodium.ready;

    const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
    const scalerPub = sodium.crypto_scalarmult_base(binPriv, "base64");
    return scalerPub;
  } else {
    logger.warn("X25519_PRIVATE_KEY is null");
    return null;
  }
}

const mergeConfigs = (configs: MergedConfigs) => {
  return merge({}, configs.parsedDefault, configs.parsedOrg, configs.parsedRepo);
};

export async function getConfig(context: Context) {
  const orgConfig = await getConfigSuperset(context, "org", CONFIG_PATH);
  const repoConfig = await getConfigSuperset(context, "repo", CONFIG_PATH);
  const payload = context.payload as Payload;

  let parsedOrg: Config | null;

  if (typeof orgConfig === "string") {
    parsedOrg = parseYAML(orgConfig);
  } else {
    parsedOrg = null;
  }

  if (parsedOrg) {
    const { valid, error } = validate(ConfigSchema, parsedOrg);
    if (!valid) {
      const err = new Error(`Invalid org config: ${error}`);
      if (payload.issue) await upsertLastCommentToIssue(payload.issue.number, err.message);
      throw err;
    }
  }

  let parsedRepo: Config | null;
  if (typeof repoConfig === "string") {
    parsedRepo = parseYAML(repoConfig);
  } else {
    parsedRepo = null;
  }

  if (parsedRepo) {
    const { valid, error } = validate(ConfigSchema, parsedRepo);
    if (!valid) {
      const err = new Error(`Invalid repo config: ${error}`);
      if (payload.issue) await upsertLastCommentToIssue(payload.issue.number, err.message);
      throw err;
    }
  }
  const parsedDefault: MergedConfig = DefaultConfig;

  const keys = { private: null, public: null } as {
    private: string | null;
    public: string | null;
  };

  if (parsedRepo && parsedRepo[KEY_NAME]) {
    await getPrivateAndPublicKeys(parsedRepo[KEY_NAME], keys);
  } else if (parsedOrg && parsedOrg[KEY_NAME]) {
    await getPrivateAndPublicKeys(parsedOrg[KEY_NAME], keys);
  }

  const configs: MergedConfigs = { parsedDefault, parsedOrg, parsedRepo };
  const mergedConfigData: MergedConfig = mergeConfigs(configs);

  const configData = {
    keys,
    ...mergedConfigData,
  };

  return configData;
}
