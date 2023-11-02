import sodium from "libsodium-wrappers";
import merge from "lodash/merge";
import { Context } from "probot";
import YAML from "yaml";
import Runtime from "../bindings/bot-runtime";
import { upsertLastCommentToIssue } from "../helpers/issue";
import { Payload, BotConfigSchema, BotConfig } from "../types";
import defaultConfiguration from "../ubiquibot-config-default";
import { validateTypes } from "./ajv";
import { z } from "zod";

const UBIQUIBOT_CONFIG_REPOSITORY = "ubiquibot-config";
const UBIQUIBOT_CONFIG_FULL_PATH = ".github/ubiquibot-config.yml";
const KEY_PREFIX = "HSK_";

export async function generateConfiguration(context: Context): Promise<BotConfig> {
  const payload = context.payload as Payload;

  const organizationConfiguration = parseYaml(
    await download({
      context,
      repository: UBIQUIBOT_CONFIG_REPOSITORY,
      owner: payload.organization?.login || payload.repository.owner.login,
    })
  );

  const repositoryConfiguration = parseYaml(
    await download({
      context,
      repository: payload.repository.name,
      owner: payload.repository.owner.login,
    })
  );

  let orgConfig: BotConfig | undefined;
  if (organizationConfiguration) {
    console.dir(organizationConfiguration, { depth: null, colors: true });
    const result = BotConfigSchema.safeParse(organizationConfiguration);
    if (!result.success) {
      const errorsWithoutStrict = result.error.issues.filter(
        (issue) => issue.code !== z.ZodIssueCode.unrecognized_keys
      );
      if (errorsWithoutStrict.length > 0) {
        const err = new Error(result.error.toString());
        throw err;
      } else {
        // make comment
      }
    }
    orgConfig = result.data;
  }

  let repoConfig: BotConfig | undefined;
  if (repositoryConfiguration) {
    console.dir(repositoryConfiguration, { depth: null, colors: true });
    const result = BotConfigSchema.safeParse(repositoryConfiguration);
    if (!result.success) {
      // TODO
    } else {
      repoConfig = result.data;
    }
  }

  const merged = merge({}, orgConfig, repoConfig);
  const result = BotConfigSchema.safeParse(merged);
  if (!result.success) {
    // TODO
    /*const issue = payload.issue?.number;
    const err = new Error(error?.toString());
    if (issue) await upsertLastCommentToIssue(issue, err.message);
    throw err;*/
  } else {
    return result.data;
  }
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

async function download({
  context,
  repository,
  owner,
}: {
  context: Context;
  repository: string;
  owner: string;
}): Promise<string | null> {
  if (!repository || !owner) throw new Error("Repo or owner is not defined");
  try {
    const { data } = await context.octokit.rest.repos.getContent({
      owner,
      repo: repository,
      path: UBIQUIBOT_CONFIG_FULL_PATH,
      mediaType: { format: "raw" },
    });
    return data as unknown as string; // this will be a string if media format is raw
  } catch (err) {
    return null;
  }
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
