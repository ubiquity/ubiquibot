import sodium from "libsodium-wrappers";
import { env } from "../bindings/env";
const KEY_PREFIX = "HSK_";

export async function decryptKeys(
  cipherText: string
): Promise<{ privateKey: string; publicKey: string } | { privateKey: null; publicKey: null }> {
  await sodium.ready;

  let _public: null | string = null;
  let _private: null | string = null;

  const { X25519_PRIVATE_KEY } = env;

  if (!X25519_PRIVATE_KEY) {
    console.warn("X25519_PRIVATE_KEY is not defined");
    return { privateKey: null, publicKey: null };
  }
  _public = await getScalarKey(X25519_PRIVATE_KEY);
  if (!_public) {
    console.warn("Public key is null");
    return { privateKey: null, publicKey: null };
  }
  const binPub = sodium.from_base64(_public, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binPriv = sodium.from_base64(X25519_PRIVATE_KEY, sodium.base64_variants.URLSAFE_NO_PADDING);
  const binCipher = sodium.from_base64(cipherText, sodium.base64_variants.URLSAFE_NO_PADDING);

  const walletPrivateKey: string | null = sodium.crypto_box_seal_open(binCipher, binPub, binPriv, "text");
  _private = walletPrivateKey?.replace(KEY_PREFIX, "");
  return { privateKey: _private, publicKey: _public };
}

async function getScalarKey(x25519PrivateKey: string) {
  await sodium.ready;
  const binPriv = sodium.from_base64(x25519PrivateKey, sodium.base64_variants.URLSAFE_NO_PADDING);
  const scalerPub = sodium.crypto_scalarmult_base(binPriv, "base64");
  return scalerPub;
}
