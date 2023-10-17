import { constants, ethers } from "ethers";
import { Logs } from "../../../adapters/supabase";
import Runtime from "../../../bindings/bot-runtime";
import { resolveAddress } from "../../../helpers";
import { Payload } from "../../../types";
// Extracts ensname from raw text.
function extractEnsName(text: string) {
  // Define a regular expression to match ENS names
  const ensRegex = /^(?=.{3,40}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/gm;

  // Find the first match of the regular expression in the input text
  const match = text.match(ensRegex);

  if (match) {
    const ensName = match[0];
    return ensName.toLowerCase();
  }
}

export async function registerWallet(body: string) {
  const runtime = Runtime.getState();
  const payload = runtime.latestEventContext.payload as Payload;
  const config = runtime.botConfig;
  const logger = runtime.logger;
  const sender = payload.sender.login;

  const regexForAddress = /(0x[a-fA-F0-9]{40})/g;
  const addressMatches = body.match(regexForAddress);
  let address = addressMatches ? addressMatches[0] : null;
  const ensName = extractEnsName(body.replace("/wallet", "").trim());

  if (!address && ensName) {
    logger.info("Trying to resolve address from ENS name", { ensName });
    address = await resolveAddress(ensName);
    if (!address) {
      throw logger.error("Resolving address from ENS name failed", { ensName });
    }
    logger.ok("Resolved address from ENS name", { ensName, address });
  }

  if (!address) {
    return logger.info("Skipping to register a wallet address because both address/ens doesn't exist");
  }

  if (config.wallet.registerWalletWithVerification) {
    _registerWalletWithVerification(body, address, logger);
  }

  if (address == constants.AddressZero) {
    return logger.warn(
      "Skipping to register a wallet address because user is trying to set their address to null address"
    );
  }

  if (payload.comment) {
    const { wallet } = runtime.adapters.supabase;
    await wallet.upsertWalletAddress(address);
    return logger.ok("Successfully registered wallet address", { sender, address });
  } else {
    throw new Error("Payload comment is undefined");
  }
}
function _registerWalletWithVerification(body: string, address: string, logger: Logs) {
  const regexForSigHash = /(0x[a-fA-F0-9]{130})/g;
  const sigHashMatches = body.match(regexForSigHash);
  const sigHash = sigHashMatches ? sigHashMatches[0] : null;
  const messageToSign = "UbiquiBot";
  const failedSigLogMsg = `Skipping to register the wallet address because you have not provided a valid SIGNATURE_HASH.`;

  try {
    const isSigHashValid =
      sigHash && ethers.utils.verifyMessage(messageToSign, sigHash) == ethers.utils.getAddress(address);
    if (!isSigHashValid) {
      throw logger.error(failedSigLogMsg);
    }
  } catch (e) {
    logger.error("Exception thrown by verifyMessage for /wallet: ", e);
    throw logger.error(failedSigLogMsg);
  }
}
