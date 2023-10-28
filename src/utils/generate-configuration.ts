import sodium from "libsodium-wrappers";
import merge from "lodash/merge";
import { Context } from "probot";
import YAML from "yaml";
import Runtime from "../bindings/bot-runtime";
import { upsertLastCommentToIssue } from "../helpers/issue";
import { Payload, PublicConfigurationValues } from "../types";
import { AllConfigurationTypes, AllConfigurationValues, PublicConfigurationTypes } from "../types/configuration-types";
import defaultConfiguration from "../ubiquibot-config-default";
import { validateTypes } from "./ajv";
import util from "util";
const UBIQUIBOT_CONFIG_REPOSITORY = "ubiquibot-config";
const UBIQUIBOT_CONFIG_FULL_PATH = ".github/ubiquibot-config.yml";
const KEY_PREFIX = "HSK_";

export async function generateConfiguration(context: Context): Promise<AllConfigurationTypes> {
  const payload = context.payload as Payload;

  const organizationConfiguration: AllConfigurationTypes = parseYaml(
    await download({
      context,
      repository: UBIQUIBOT_CONFIG_REPOSITORY,
      owner: payload.organization?.login || payload.repository.owner.login,
    })
  );

  const repositoryConfiguration: PublicConfigurationTypes = parseYaml(
    await download({
      context,
      repository: payload.repository.name,
      owner: payload.repository.owner.login,
    })
  );

  if (organizationConfiguration) {
    // console.dir({
    // AllConfigurationValues: ,
    // organizationConfiguration,
    // });
    console.dir(organizationConfiguration, { depth: null, colors: true });
    const { valid, error } = validateTypes(AllConfigurationValues, organizationConfiguration);
    if (!valid) {
      const issue = payload.issue?.number;
      const err = new Error(error?.toString());
      if (issue) await upsertLastCommentToIssue(issue, err.message);
      throw err;
    }
  }
  if (repositoryConfiguration) {
    console.dir(PublicConfigurationValues, { depth: null, colors: true });
    const { valid, error } = validateTypes(PublicConfigurationValues, repositoryConfiguration);
    if (!valid) {
      const issue = payload.issue?.number;
      const err = new Error(error?.toString());
      if (issue) await upsertLastCommentToIssue(issue, err.message);
      throw err;
    }
  }

  const keys = await getKeys(organizationConfiguration); // only decrypt keys from org config
  const merged = merge(keys, defaultConfiguration, organizationConfiguration, repositoryConfiguration);
  return merged;
}

async function getKeys(configuration: AllConfigurationTypes | null) {
  try {
    if (configuration?.keys.evmPrivateEncrypted) {
      return await decryptKeys(configuration.keys.evmPrivateEncrypted);
    }
  } catch (error) {
    console.warn("Failed to get keys", { error });
  }
  return { private: null, public: null };
}

// async function fetchConfigurations(context: Context, type: "org" | "repo") {
//   const payload = context.payload as Payload;
//   let repo: string;
//   let owner: string;
//   if (type === "org") {
//     repo = CONFIG_REPO;
//     owner = payload.organization?.login || payload.repository.owner.login;
//   } else {
//     repo = payload.repository.name;
//     owner = payload.repository.owner.login;
//   }
//   if (!repo || !owner) return null;
//   const { data } = await context.octokit.rest.repos.getContent({
//     owner,
//     repo,
//     path: CONFIG_PATH,
//     mediaType: { format: "raw" },
//   });
//   return data as unknown as string; // not sure why the types are wrong but this is definitely returning a string
// }

async function download({ context, repository, owner }: { context: Context; repository: string; owner: string }) {
  if (!repository || !owner) throw new Error("Repo or owner is not defined");
  const { data } = await context.octokit.rest.repos.getContent({
    owner,
    repo: repository,
    path: UBIQUIBOT_CONFIG_FULL_PATH,
    mediaType: { format: "raw" },
  });
  return data as unknown as string; // not sure why the types are wrong but this is definitely returning a string
}

export function parseYaml(data: null | string) {
  try {
    if (data) {
      const parsedData = YAML.parse(data);
      return parsedData ?? null;
    }
  } catch (error) {
    const logger = Runtime.getState().logger;
    logger.error("Failed to parse YAML", { error });
  }
  return null;
}

async function decryptKeys(cipherText: string) {
  await sodium.ready;

  let _public: null | string = null;
  let _private: null | string = null;

  const X25519_PRIVATE_KEY = process.env.X25519_PRIVATE_KEY;

  if (!X25519_PRIVATE_KEY) {
    console.warn("X25519_PRIVATE_KEY is not defined");
    return { private: null, public: null };
  }
  _public = await getScalarKey(X25519_PRIVATE_KEY);
  if (!_public) {
    console.warn("Public key is null");
    return { private: null, public: null };
  }
  const binPub = sodium.from_base64(_public, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binCipher = sodium.from_base64(cipherText, sodium.base64_variants.URLSAFE_NO_PADDING);

  const walletPrivateKey: string | null = sodium.crypto_box_seal_open(binCipher, binPub, binPriv, "text");
  _private = walletPrivateKey?.replace(KEY_PREFIX, "");
  return { private: _private, public: _public };
}
async function getScalarKey(X25519_PRIVATE_KEY: string) {
  await sodium.ready;
  const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
  const scalerPub = sodium.crypto_scalarmult_base(binPriv, "base64");
  return scalerPub;
}
