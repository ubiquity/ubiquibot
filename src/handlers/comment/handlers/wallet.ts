import { upsertWalletAddress } from "../../../adapters/supabase";
import { getBotContext, getLogger } from "../../../bindings";
import { resolveAddress } from "../../../helpers";
import { Payload } from "../../../types";
import { formatEthAddress } from "../../../utils";
import { IssueCommentCommands } from "../commands";

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
    return;
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

  if (address) {
    if (address == "0x0000000000000000000000000000000000000000"){
      logger.info("Skipping to register a wallet address because user is trying to set their address to null address");
      return `Cannot set address to null address`
    }
    await upsertWalletAddress(sender, address);
    return `Updated the wallet address for @${sender} successfully!\t Your new address: ${formatEthAddress(address)}`;
  }

  return;
};
