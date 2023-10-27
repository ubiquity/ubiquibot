import sodium from "libsodium-wrappers";
import merge from "lodash/merge";
import { Context } from "probot";
import YAML from "yaml";
import Runtime from "../bindings/bot-runtime";
import { upsertLastCommentToIssue } from "../helpers/issue";
import { ConfigSchema, Payload } from "../types";
import { Config } from "../types/config";
import { validate } from "./ajv";
import defaultConfiguration from "../ubiquibot-config-default";
const CONFIG_REPO = "ubiquibot-config";
const CONFIG_PATH = ".github/ubiquibot-config.yml";
const PRIVATE_KEY_ENCRYPTED_PROPERTY_NAME = "privateKeyEncrypted";
const KEY_PREFIX = "HSK_";

async function downloadConfigs(context: Context) {
  const organizationConfigRaw = await downloadConfig(context, "org");
  const repositoryConfigRaw = await downloadConfig(context, "repo");

  const parsedOrganization = parseYamlConfig(organizationConfigRaw);
  const parsedRepository = parseYamlConfig(repositoryConfigRaw);

  if (parsedOrganization) await validateConfiguration(context.payload, parsedOrganization);
  if (parsedRepository) await validateConfiguration(context.payload, parsedRepository);

  return {
    organization: parsedOrganization,
    repository: parsedRepository,
  };
}

type Keys = { private: string | null; public: string | null };
type DefaultConfigurationWithKeys = { keys: Keys } & typeof defaultConfiguration;

export async function getConfig(context: Context): Promise<DefaultConfigurationWithKeys> {
  const configuration = await downloadConfigs(context);
  const keys = await getKeys(configuration);
  const merged = merge({}, defaultConfiguration, configuration.organization, configuration.repository);
  return { keys, ...merged };
}

async function getKeys(configuration: { repository: Config | null; organization: Config | null }) {
  let keys: Keys = { private: null, public: null };
  try {
    if (configuration.repository && configuration.repository[PRIVATE_KEY_ENCRYPTED_PROPERTY_NAME]) {
      keys = await getPrivateAndPublicKeys(configuration.repository[PRIVATE_KEY_ENCRYPTED_PROPERTY_NAME]);
    } else if (configuration.organization && configuration.organization[PRIVATE_KEY_ENCRYPTED_PROPERTY_NAME]) {
      keys = await getPrivateAndPublicKeys(configuration.organization[PRIVATE_KEY_ENCRYPTED_PROPERTY_NAME]);
    }
  } catch (error) {
    console.warn("Failed to get keys", { error });
  }
  return keys;
}

async function downloadConfig(context: Context, type: "org" | "repo") {
  const payload = context.payload as Payload;
  let repo: string;
  let owner: string;
  if (type === "org") {
    repo = CONFIG_REPO;
    owner = payload.organization?.login || payload.repository.owner.login;
  } else {
    repo = payload.repository.name;
    owner = payload.repository.owner.login;
  }
  if (!repo || !owner) return null;
  const { data } = await context.octokit.rest.repos.getContent({
    owner,
    repo,
    path: CONFIG_PATH,
    mediaType: { format: "raw" },
  });
  return data as unknown as string; // not sure why the types are wrong but this is definitely returning a string
}
// interface MergedConfigs {
//   parsedRepo: Config | null;
//   parsedOrg: Config | null;
//   parsedDefault: MergedConfig;
// }
export function parseYamlConfig(data: null | string): Config | null {
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

async function getPrivateAndPublicKeys(cipherText: string) {
  const keys: Keys = {
    private: null,
    public: null,
  };

  await sodium.ready;
  const X25519_PRIVATE_KEY = process.env.X25519_PRIVATE_KEY;
  if (!X25519_PRIVATE_KEY) {
    console.warn("X25519_PRIVATE_KEY is not defined");
    return keys;
  }
  keys.public = await getScalarKey(X25519_PRIVATE_KEY);
  if (!keys.public) {
    console.warn("Public key is null");
    return keys;
  }
  const binPub = sodium.from_base64(keys.public, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binCipher = sodium.from_base64(cipherText, sodium.base64_variants.URLSAFE_NO_PADDING);

  const walletPrivateKey: string | null = sodium.crypto_box_seal_open(binCipher, binPub, binPriv, "text");
  keys.private = walletPrivateKey?.replace(KEY_PREFIX, "");
  return keys;
}
async function getScalarKey(X25519_PRIVATE_KEY: string) {
  const logger = Runtime.getState().logger;
  if (X25519_PRIVATE_KEY !== null) {
    await sodium.ready;
    // console.trace();
    const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
    const scalerPub = sodium.crypto_scalarmult_base(binPriv, "base64");
    return scalerPub;
  } else {
    logger.warn("X25519_PRIVATE_KEY is null");
    return null;
  }
}

async function validateConfiguration(payload, parsedConfiguration: Config | null) {
  const { valid, error } = validate(ConfigSchema, parsedConfiguration);
  if (!valid) {
    const err = new Error(error);
    if (payload.issue) await upsertLastCommentToIssue(payload.issue.number, err.message);
    throw err;
  }
}
