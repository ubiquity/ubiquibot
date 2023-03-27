import { ethers } from "ethers";
import { getBotConfig } from "../bindings";

/**
 * Gets the Ethereum address associated with an ENS (Ethereum Name Service) name
 * @param ensName - The ENS name, i.e. alice12345.crypto
 */
export const resolveAddress = async (ensName: string): Promise<string | null> => {
  const {
    payout: { rpc },
  } = getBotConfig();
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const address = await provider.resolveName(ensName);
  return address;
};
