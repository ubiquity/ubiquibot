import { ethers } from "ethers";
import { upsertWalletAddress } from "../../../adapters/supabase";
import { getBotContext } from "../../../bindings";
import { addCommentToIssue, resolveAddress } from "../../../helpers";
import { Payload } from "../../../types";

const extractEnsName = (text: string): string | undefined => {
  // Define a regular expression to match ENS names
  const ensRegex = /^([a-z0-9](?:-?[a-z0-9]){0,61}[a-z0-9])?\.([a-z]{2,})(\.eth)?$/i;

  // Find the first match of the regular expression in the input text
  const match = text.match(ensRegex);

  if (match) {
    // Construct the full ENS name from the matched groups
    const [label, tld, eth] = match;
    const ensName = `${label}${tld || eth || ""}`;

    // Validate the ENS name using ethers.js
    if (ethers.utils.isAddress(ensName)) {
      return ensName.toLowerCase();
    }
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
  let address = addressMatches ? addressMatches[0] : undefined;
  const ensName = extractEnsName(body);
  log.info(`Received '/wallet' command from user: ${sender}, body: ${body}`);

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
  }

  await upsertWalletAddress(sender, address);
  await addCommentToIssue(`Updated the wallet address for @${sender} successfully! address: ${address}`, issue!.number);
};
