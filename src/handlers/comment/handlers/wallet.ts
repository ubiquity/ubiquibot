import { constants, ethers } from "ethers";
import { Logs } from "../../../adapters/supabase";
import Runtime from "../../../bindings/bot-runtime";
import { resolveAddress } from "../../../helpers";
import { Context, Payload } from "../../../types";
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

export async function registerWallet(context: Context, body: string) {
  const runtime = Runtime.getState();
  const payload = context.event.payload as Payload;
  const config = context.config;
  const logger = runtime.logger;
  const sender = payload.sender.login;

  const regexForAddress = /(0x[a-fA-F0-9]{40})/g;
  const addressMatches = body.match(regexForAddress);
  let address = addressMatches ? addressMatches[0] : null;
  const ensName = extractEnsName(body.replace("/wallet", "").trim());

  if (!address && ensName) {
    logger.info(context.event, "Trying to resolve address from ENS name", { ensName });
    address = await resolveAddress(ensName);
    if (!address) {
      throw logger.error(context.event, "Resolving address from ENS name failed", { ensName });
    }
    logger.ok(context.event, "Resolved address from ENS name", { ensName, address });
  }

  if (!address) {
    return logger.info(context.event, "Skipping to register a wallet address because both address/ens doesn't exist");
  }

  if (config.miscellaneous.registerWalletWithVerification) {
    _registerWalletWithVerification(context, body, address, logger);
  }

  if (address == constants.AddressZero) {
    return logger.warn(
      context.event,
      "Skipping to register a wallet address because user is trying to set their address to null address"
    );
  }

  if (payload.comment) {
    const { wallet } = runtime.adapters.supabase;
    await wallet.upsertWalletAddress(context.event, address);
    return logger.ok(context.event, "Successfully registered wallet address", { sender, address });
  } else {
    throw new Error("Payload comment is undefined");
  }
}

function _registerWalletWithVerification(context: Context, body: string, address: string, logger: Logs) {
  const regexForSigHash = /(0x[a-fA-F0-9]{130})/g;
  const sigHashMatches = body.match(regexForSigHash);
  const sigHash = sigHashMatches ? sigHashMatches[0] : null;
  const messageToSign = "UbiquiBot";
  const failedSigLogMsg = `Skipping to register the wallet address because you have not provided a valid SIGNATURE_HASH.`;

  try {
    const isSigHashValid =
      sigHash && ethers.utils.verifyMessage(messageToSign, sigHash) == ethers.utils.getAddress(address);
    if (!isSigHashValid) {
      throw logger.error(context.event, failedSigLogMsg);
    }
  } catch (e) {
    logger.error(context.event, "Exception thrown by verifyMessage for /wallet: ", e);
    throw logger.error(context.event, failedSigLogMsg);
  }
}
