import { BigNumberish } from "ethers";
import { getAdapters, getLogger } from "../../bindings/event";
interface RemovePenalty {
  username: string;
  repoName: string;
  tokenAddress: string;
  networkId: string;
  penalty: BigNumberish;
}
export async function removePenalty({
  username,
  repoName,
  tokenAddress,
  networkId,
  penalty,
}: RemovePenalty): Promise<void> {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { error } = await supabase.rpc("remove_penalty", {
    _username: username,
    _repository_name: repoName,
    _network_id: networkId,
    _token_address: tokenAddress,
    _penalty_amount: penalty.toString(),
  });
  logger.debug(`Removing penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error removing penalty: ${error.message}`);
  }
}

//
