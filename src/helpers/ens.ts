import { ethers } from "ethers";

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
