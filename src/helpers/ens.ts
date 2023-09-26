import { ethers } from "ethers";
import { DEFAULT_RPC_ENDPOINT } from "../configs/shared";

/**
 * Gets the Ethereum address associated with an ENS (Ethereum Name Service) name
 * @param ensName - The ENS name, i.e. alice12345.crypto
 */
export const resolveAddress = async (ensName: string): Promise<string | null> => {
  // Explicitly set provider to Ethereum mainnet
  console.trace(DEFAULT_RPC_ENDPOINT);
  const provider = new ethers.providers.JsonRpcProvider(DEFAULT_RPC_ENDPOINT); // mainnet required for ENS
  const address = await provider.resolveName(ensName);
  return address;
};
