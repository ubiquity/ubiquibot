import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { Payload } from "../types";
import { Context } from "probot";
import { fromConfig as config } from "./helpers";
import { DefaultConfiguration, RepositoryConfiguration, OrganizationConfiguration, ImportedConfigurations } from "./private.d";

// const CONFIGURATION_PATH = "ubiquibot-config";
const CONFIGURATION_PATH = ".github/ubiquibot.yml";
const PRIVATE_KEY_NAME = "private-key-encrypted";
const PRIVATE_KEY_PREFIX = "HSK_";

// defaults
export const defaultConfiguration = {
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
} as DefaultConfiguration;

// async function loadConfigurations(context: Context) {

//    const params: {
//     owner: "ubiquity";
//     repo: "ubiquibot";
//     path: ".github/config.yml";
//   } = context.repo({
//     path: CONFIGURATION_PATH as ".github/config.yml", // bad typing
//   });

//   const { data } = await context.octokit.rest.repos.getContent({
//     owner: params.owner,
//     repo: params.repo,
//     path: CONFIGURATION_PATH,
//     mediaType: {
//       format: "raw",
//     },
//   });

//   return data;
// }

export const getConfigSuperset = async (context: Context, type: "org"): Promise<string | undefined> => {
  const payload = context.payload as Payload;
  let repositoryName = payload.repository.name;
  let ownerLogin = payload.repository.owner.login;

  if (type === "org") {
    repositoryName = `.github`;
    const login = payload.organization?.login;
    if (login) {
      ownerLogin = login;
    }
  }

  if (!repositoryName || !ownerLogin) {
    return undefined;
  }

  try {
    const { data } = await context.octokit.rest.repos.getContent({
      owner: ownerLogin,
      repo: repositoryName,
      path: CONFIGURATION_PATH,
      mediaType: {
        format: "raw",
      },
    });
    return data as unknown as string;
  } catch (error: unknown) {
    console.error(error);
    return undefined;
  }
};

export const parseYAML = (data?: string): RepositoryConfiguration => {
  try {
    if (data) {
      const parsedData = YAML.parse(data);
      return parsedData;
    }
  } catch (error) {
    console.error(error);
  }
  return defaultConfiguration;
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
    walletPrivateKey = walletPrivateKey.replace(PRIVATE_KEY_PREFIX, "");
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
  const _organization = await getConfigSuperset(context, "org");
  const organization: OrganizationConfiguration = parseYAML(_organization);

  const _repository = await getConfigSuperset(context, "repo");
  const repository: RepositoryConfiguration = parseYAML(_repository);

  const configs = { repository, organization } as ImportedConfigurations;

  const configData = {
    privateKey: organization && organization[PRIVATE_KEY_NAME] ? await getPrivateKey(organization[PRIVATE_KEY_NAME]) : "",

    evmNetworkId: config.getNumber("evm-network-id", configs),
    baseMultiplier: config.getNumber("base-multiplier", configs),
    issueCreatorMultiplier: config.getNumber("issue-creator-multiplier", configs),
    timeLabels: config.getLabels("time-labels", configs),
    priorityLabels: config.getLabels("priority-labels", configs),
    autoPayMode: config.getBoolean("auto-pay-mode", configs),
    analyticsMode: config.getBoolean("analytics-mode", configs),
    maxConcurrentBounties: config.getNumber("max-concurrent-bounties", configs),
    incentiveMode: config.getBoolean("incentive-mode", configs),
    commentElementPricing: config.getCommentItemPrice("comment-element-pricing", configs),
    defaultLabels: config.getStrings("default-labels", configs),
    promotionComment: config.getString("promotion-comment", configs),
  };

  return configData;
};
