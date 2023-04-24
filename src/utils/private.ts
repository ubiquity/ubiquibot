import _sodium from "libsodium-wrappers";
import YAML from "yaml";
import { getBotConfig, getBotContext } from "../bindings";
import { Payload } from "../types";

const CONFIG_REPO = "ubiquibot-config";
const KEY_PATH = ".github/ubiquibot-config.yml";
const KEY_NAME = "PSK";
const KEY_PREFIX = "HSK_";

export const getPrivateKey = async (): Promise<string | undefined> => {
  try {
    await _sodium.ready;
    const sodium = _sodium;
    const context = getBotContext();
    const {
      sodium: { publicKey, privateKey },
    } = getBotConfig();
    const payload = context.payload as Payload;

    if (publicKey === "" || privateKey === "") {
      return undefined;
    }

    const { data } = await context.octokit.rest.repos.getContent({
      owner: payload.organization?.login!,
      repo: CONFIG_REPO,
      path: KEY_PATH,
      mediaType: {
        format: "raw",
      },
    });

    if (data) {
      const parsedText = YAML.parse(data as any);
      const cipherText = parsedText[KEY_NAME] ? parsedText[KEY_NAME] : undefined;
      if (cipherText !== undefined) {
        const binPub = sodium.from_base64(publicKey, sodium.base64_variants.URLSAFE_NO_PADDING);
        const binPriv = sodium.from_base64(privateKey, sodium.base64_variants.URLSAFE_NO_PADDING);
        const binCipher = sodium.from_base64(cipherText, sodium.base64_variants.URLSAFE_NO_PADDING);

        let walletPrivateKey: string | undefined = sodium.crypto_box_seal_open(binCipher, binPub, binPriv, "text");
        walletPrivateKey = walletPrivateKey.startsWith(KEY_PREFIX) ? walletPrivateKey.replace(KEY_PREFIX, "") : undefined;
        return walletPrivateKey;
      }
    }
    return undefined;
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
