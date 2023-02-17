import { upsertWalletAddress } from "../../../adapters/supabase";
import { getBotContext } from "../../../bindings";
import { Payload } from "../../../types";

export const registerWallet = async (body: string): Promise<void> => {
  const { log, payload: _payload } = getBotContext();
  const payload = _payload as Payload;
  const sender = payload.sender.login;
  const regex = /(0x[a-fA-F0-9]{40})/g;
  const matches = body.match(regex);
  const address = matches ? matches[0] : undefined;
  log.info(`Received '/wallet' command from user: ${sender}, wallet_address: ${address}`);

  if (!address) {
    log.info("Skipping to register a wallet address because address is null");
    return;
  }

  await upsertWalletAddress(sender, address);
};
