import { ethers } from "ethers";
import { ERC20ABI } from "../configs";

export const getTokenSymbol = async (tokenAddress: string, rpcUrl: string): Promise<string> => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const contractInstance = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const symbol = await contractInstance.symbol();
  return symbol;
};
