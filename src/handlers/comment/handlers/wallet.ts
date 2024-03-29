import { constants, ethers } from "ethers";
import Runtime from "../../../bindings/bot-runtime";
import { Context } from "../../../types/context";
import { GitHubPayload } from "../../../types/payload";

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
  const payload = context.event.payload as GitHubPayload;
  const config = context.config;
  const logger = context.logger;
  const sender = payload.sender.login;

  const regexForAddress = /(0x[a-fA-F0-9]{40})/g;
  const addressMatches = body.match(regexForAddress);
  let address = addressMatches ? addressMatches[0] : null;
  const ensName = extractEnsName(body.replace("/wallet", "").trim());

  if (!address && ensName) {
    context.logger.info("Trying to resolve address from ENS name", { ensName });
    address = await resolveAddress(ensName);
    if (!address) {
      throw context.logger.fatal("Resolving address from ENS name failed", { ensName });
    }
    context.logger.ok("Resolved address from ENS name", { ensName, address });
  }

  if (!address) {
    return context.logger.info("Skipping to register a wallet address because both address/ens doesn't exist");
  }

  if (config.miscellaneous.registerWalletWithVerification) {
    registerWalletWithVerification(context, body, address);
  }

  if (address == constants.AddressZero) {
    return logger.error(
      "Skipping to register a wallet address because user is trying to set their address to null address"
    );
  }

  if (payload.comment) {
    const { wallet } = runtime.adapters.supabase;
    await wallet.upsertWalletAddress(context.event, address);
    return context.logger.ok("Successfully registered wallet address", { sender, address });
  } else {
    throw new Error("Payload comment is undefined");
  }
}

function registerWalletWithVerification(context: Context, body: string, address: string) {
  const regexForSigHash = /(0x[a-fA-F0-9]{130})/g;
  const sigHashMatches = body.match(regexForSigHash);
  const sigHash = sigHashMatches ? sigHashMatches[0] : null;
  const messageToSign = "UbiquiBot";
  const failedSigLogMsg = `Skipping to register the wallet address because you have not provided a valid SIGNATURE_HASH.`;

  try {
    const isSigHashValid =
      sigHash && ethers.utils.verifyMessage(messageToSign, sigHash) == ethers.utils.getAddress(address);
    if (!isSigHashValid) {
      throw context.logger.fatal(failedSigLogMsg);
    }
  } catch (e) {
    context.logger.fatal("Exception thrown by verifyMessage for /wallet: ", e);
    throw context.logger.fatal(failedSigLogMsg);
  }
}

export async function resolveAddress(ensName: string): Promise<string | null> {
  // Gets the Ethereum address associated with an ENS (Ethereum Name Service) name
  // Explicitly set provider to Ethereum mainnet
  const provider = new ethers.providers.JsonRpcProvider(`https://rpc-bot.ubq.fi/v1/mainnet`); // mainnet required for ENS
  const address = await provider.resolveName(ensName).catch((err) => {
    console.trace({ err });
    return null;
  });

  return address;
}
