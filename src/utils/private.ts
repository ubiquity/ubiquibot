import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { getBotConfig } from "../bindings";
import { Payload } from "../types";
import { DefaultPriceConfig } from "../configs";
import { Context } from "probot";

const CONFIG_REPO = "ubiquibot-config";
const KEY_PATH = ".github/ubiquibot-config.yml";
const KEY_NAME = "PSK";
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

interface WideLabel {
  name: string;
  weight: number;
  value?: number | undefined;
  target: string;
}

interface WideConfig {
  baseMultiplier?: number;
  timeLabels?: WideLabel[];
  priorityLabels?: WideLabel[];
  autoPayMode?: boolean;
  analyticsMode?: boolean;
}

interface WideRepoConfig extends WideConfig {}

interface WideOrgConfig extends WideConfig {
  PSK?: string;
}

interface DataConfig {
  privateKey: string;
  baseMultiplier: number;
  timeLabels: WideLabel[];
  priorityLabels: WideLabel[];
  autoPayMode: boolean;
  analyticsMode: boolean;
}

export const parseYAML = async (data: any): Promise<any | undefined> => {
  try {
    const parsedData = await YAML.parse(data);
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
    const {
      sodium: { publicKey, privateKey },
    } = getBotConfig();

    if (publicKey === "" || privateKey === "") {
      return undefined;
    }

    const binPub = sodium.from_base64(publicKey, sodium.base64_variants.URLSAFE_NO_PADDING);
    const binPriv = sodium.from_base64(privateKey, sodium.base64_variants.URLSAFE_NO_PADDING);
    const binCipher = sodium.from_base64(cipherText, sodium.base64_variants.URLSAFE_NO_PADDING);

    let walletPrivateKey: string | undefined = sodium.crypto_box_seal_open(binCipher, binPub, binPriv, "text");
    walletPrivateKey = walletPrivateKey.startsWith(KEY_PREFIX) ? walletPrivateKey.replace(KEY_PREFIX, "") : undefined;
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

export const getWideConfig = async (context: Context): Promise<DataConfig> => {
  const orgConfig = await getConfigSuperset(context, "org");
  const repoConfig = await getConfigSuperset(context, "repo");

  const parsedOrg: WideOrgConfig | undefined = await parseYAML(orgConfig);
  const parsedRepo: WideRepoConfig | undefined = await parseYAML(repoConfig);
  const PSK = parsedOrg && parsedOrg[KEY_NAME] ? await getPrivateKey(parsedOrg[KEY_NAME]) : undefined;

  const configData: DataConfig = {
    privateKey: PSK ?? process.env.UBIQUITY_BOT_EVM_PRIVATE_KEY ?? "",
    baseMultiplier:
      parsedRepo && parsedRepo["baseMultiplier"] && !Number.isNaN(Number(parsedRepo["baseMultiplier"]))
        ? Number(parsedRepo["baseMultiplier"])
        : parsedOrg && parsedOrg["baseMultiplier"] && !Number.isNaN(Number(parsedOrg["baseMultiplier"]))
        ? Number(parsedOrg["baseMultiplier"])
        : Number(DefaultPriceConfig["baseMultiplier"]),
    timeLabels:
      parsedRepo && parsedRepo["timeLabels"] && Array.isArray(parsedRepo["timeLabels"]) && parsedRepo["timeLabels"].length > 0
        ? parsedRepo["timeLabels"]
        : parsedOrg && parsedOrg["timeLabels"] && Array.isArray(parsedOrg["timeLabels"]) && parsedOrg["timeLabels"].length > 0
        ? parsedOrg["timeLabels"]
        : DefaultPriceConfig["timeLabels"],
    priorityLabels:
      parsedRepo && parsedRepo["priorityLabels"] && Array.isArray(parsedRepo["priorityLabels"]) && parsedRepo["priorityLabels"].length > 0
        ? parsedRepo["priorityLabels"]
        : parsedOrg && parsedOrg["priorityLabels"] && Array.isArray(parsedOrg["priorityLabels"]) && parsedOrg["priorityLabels"].length > 0
        ? parsedOrg["priorityLabels"]
        : DefaultPriceConfig["priorityLabels"],
    autoPayMode:
      parsedRepo && parsedRepo["autoPayMode"] && typeof parsedRepo["autoPayMode"] === "boolean"
        ? parsedRepo["autoPayMode"]
        : parsedOrg && parsedOrg["autoPayMode"] && typeof parsedOrg["autoPayMode"] === "boolean"
        ? parsedOrg["autoPayMode"]
        : true,
    analyticsMode:
      parsedRepo && parsedRepo["analyticsMode"] && typeof parsedRepo["analyticsMode"] === "boolean"
        ? parsedRepo["analyticsMode"]
        : parsedOrg && parsedOrg["analyticsMode"] && typeof parsedOrg["analyticsMode"] === "boolean"
        ? parsedOrg["analyticsMode"]
        : false,
  };

  return configData;
};
