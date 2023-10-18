import { ethers } from "ethers";
import { abi as ERC20ABI } from "@openzeppelin/contracts/build/contracts/ERC20.json";

export async function getTokenSymbol(tokenAddress: string, rpcUrl: string): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const contractInstance = new ethers.Contract(tokenAddress, ERC20ABI, provider);
  const symbol = await contractInstance.symbol();
  return symbol;
}
