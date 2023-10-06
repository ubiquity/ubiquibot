import { ethers } from "ethers";
// import { upsertWalletAddress } from "../../../adapters/supabase";
import { getAdapters, getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { resolveAddress } from "../../../helpers";
import { Payload } from "../../../types";
import { formatEthAddress } from "../../../utils";
import { IssueCommentCommands } from "../commands";
import { constants } from "ethers";
// Extracts ensname from raw text.
const extractEnsName = (text: string): string | undefined => {
  // Define a regular expression to match ENS names
  const ensRegex = /^(?=.{3,40}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/gm;

  // Find the first match of the regular expression in the input text
  const match = text.match(ensRegex);

  if (match) {
    const ensName = match[0];
    return ensName.toLowerCase();
  }

  return undefined;
};

export const registerWallet = async (body: string) => {
  const { payload: _payload } = getBotContext();
  const config = getBotConfig();
  const logger = getLogger();
  const payload = _payload as Payload;
  const sender = payload.sender.login;
  const regexForAddress = /(0x[a-fA-F0-9]{40})/g;
  const addressMatches = body.match(regexForAddress);
  let address = addressMatches ? addressMatches[0] : null;
  const ensName = extractEnsName(body.replace(IssueCommentCommands.WALLET, "").trim());
  logger.info(`Received '/wallet' command from user: ${sender}, body: ${body}, ${ensName}`);

  if (!address && !ensName) {
    logger.info("Skipping to register a wallet address because both address/ens doesn't exist");
    if (config.wallet.registerWalletWithVerification) {
      return `Please include your wallet or ENS address.\n usage: /wallet 0x0000000000000000000000000000000000000000 0x0830f316c982a7fd4ff050c8fdc1212a8fd92f6bb42b2337b839f2b4e156f05a359ef8f4acd0b57cdedec7874a865ee07076ab2c81dc9f9de28ced55228587f81c`;
    }
    return `Please include your wallet or ENS address.\n usage: /wallet 0x0000000000000000000000000000000000000000`;
  }

  if (!address && ensName) {
    logger.info(`Trying to resolve address from Ens name: ${ensName}`);
    address = await resolveAddress(ensName);
    if (!address) {
      logger.info(`Resolving address from Ens name failed, EnsName: ${ensName}`);
      return `Resolving address from Ens name failed, Try again`;
    }
    logger.info(`Resolved address from Ens name: ${ensName}, address: ${address}`);
  }

  if (config.wallet.registerWalletWithVerification) {
    const regexForSigHash = /(0x[a-fA-F0-9]{130})/g;
    const sigHashMatches = body.match(regexForSigHash);
    const sigHash = sigHashMatches ? sigHashMatches[0] : null;

    const messageToSign = "DevPool";
    const failedSigLogMsg = `Skipping to register the wallet address because you have not provided a valid SIGNATURE_HASH.`;
    const failedSigResponse = `Skipping to register the wallet address because you have not provided a valid SIGNATURE_HASH. \nUse [etherscan](https://etherscan.io/verifiedSignatures) to sign the message \`${messageToSign}\` and register your wallet by appending the signature hash.\n\n**Usage:**\n/wallet <WALLET_ADDRESS | ENS_NAME> <SIGNATURE_HASH>\n\n**Example:**\n/wallet 0x0000000000000000000000000000000000000000 0x0830f316c982a7fd4ff050c8fdc1212a8fd92f6bb42b2337b839f2b4e156f05a359ef8f4acd0b57cdedec7874a865ee07076ab2c81dc9f9de28ced55228587f81c`;
    try {
      //verifyMessage throws an error when some parts(r,s,v) of the signature are correct but some are not
      const isSigHashValid =
        address && sigHash && ethers.utils.verifyMessage(messageToSign, sigHash) == ethers.utils.getAddress(address);
      if (!isSigHashValid) {
        logger.info(failedSigLogMsg);
        return failedSigResponse;
      }
    } catch (e) {
      logger.info(`Exception thrown by verifyMessage for /wallet: ${e}`);
      logger.info(failedSigLogMsg);
      return failedSigResponse;
    }
  }

  if (address) {
    if (address == constants.AddressZero) {
      logger.info("Skipping to register a wallet address because user is trying to set their address to null address");
      return `Cannot set address to null address`;
    }

    if (address && payload.comment) {
      const { wallet } = getAdapters().supabase;
      await wallet.upsertWalletAddress(address, { user: payload.sender, comment: payload.comment });
      return logger.info(
        `Updated the wallet address for @${sender} successfully!\t Your new address: ${formatEthAddress(address)}`
      );
    } else {
      throw new Error("Payload comment is undefined");
    }
  }

  return;
};
