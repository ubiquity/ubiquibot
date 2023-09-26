import { ethers } from "ethers";
import { BotContext } from "../types";
/**
 * Gets the Ethereum address associated with an ENS (Ethereum Name Service) name
 * @param ensName - The ENS name, i.e. alice12345.crypto
 */
export const resolveAddress = async (context: BotContext, ensName: string): Promise<string | null> => {
  const {
    payout: { rpc },
  } = context.botConfig;
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const address = await provider.resolveName(ensName);
  return address;
};
