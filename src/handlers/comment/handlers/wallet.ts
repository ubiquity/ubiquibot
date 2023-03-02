import { upsertWalletAddress } from "../../../adapters/supabase";
import { getBotContext } from "../../../bindings";
import { addCommentToIssue, resolveAddress } from "../../../helpers";
import { Payload } from "../../../types";
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

export const registerWallet = async (body: string): Promise<void> => {
  const { log, payload: _payload } = getBotContext();
  const payload = _payload as Payload;
  const issue = payload.issue;
  const sender = payload.sender.login;
  const regexForAddress = /(0x[a-fA-F0-9]{40})/g;
  const addressMatches = body.match(regexForAddress);
  let address = addressMatches ? addressMatches[0] : null;
  const ensName = extractEnsName(body.replace(IssueCommentCommands.WALLET, "").trim());
  log.info(`Received '/wallet' command from user: ${sender}, body: ${body}, ${ensName}`);

  if (!address && !ensName) {
    log.info("Skipping to register a wallet address because both address/ens doesn't exist");
    return;
  }

  if (!address) {
    log.info(`Trying to resolve address from Ens name: ${ensName}`);
    address = await resolveAddress(ensName!);
    if (!address) {
      log.info(`Resolving address from Ens name failed, EnsName: ${ensName}`);
      return;
    }
    log.info(`Resolved address from Ens name: ${ensName}, address: ${address}`);
  }

  await upsertWalletAddress(sender, address);
  await addCommentToIssue(`Updated the wallet address for @${sender} successfully!\t Your new address: ${address}`, issue!.number);
};
