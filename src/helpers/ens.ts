import { ethers } from "ethers";
import { getBotConfig } from "../bindings";

const EnsRegistryMap: Record<string, string> = {
  "1": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
};

/**
 * Gets the Ethereum address associated with an ENS (Ethereum Name Service) name
 * @param ensName - The ENS name, i.e. alice12345.crypto
 */
export const resolveAddress = async (ensName: string): Promise<string | undefined> => {
  const {
    payout: { chainId, rpc },
  } = getBotConfig();
  let address;
  if (!EnsRegistryMap[chainId.toString()]) return undefined;

  const ensRegistryAddress = EnsRegistryMap[chainId.toString()];
  const provider = new ethers.providers.JsonRpcProvider(rpc);

  const ensRegistryAbi = ["function resolver(bytes32 tld) view returns (address)"];
  const ensRegistry = new ethers.Contract(ensRegistryAddress, ensRegistryAbi, provider);
  const tld = `.${ensName.split(".")[1]}`;
  const tldHash = ethers.utils.namehash(tld);
  const resolverAddress = await ensRegistry.resolver(tldHash);

  const ensResolverAbi = ["function addr(bytes32 node) view returns (address)"];
  const ensResolver = new ethers.Contract(resolverAddress, ensResolverAbi, provider);

  // Get the Ethereum address associated with the ENS name
  const node = ethers.utils.namehash(ensName);
  address = await ensResolver.addr(node);

  return address;
};
