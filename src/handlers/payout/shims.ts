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
export async function getLabelChanges(repository: string, labels: string[]) {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { data, error } = await supabase
    .from("label_changes")
    .select("*")
    .in("label_to", labels)
    .eq("repository", repository)
    .eq("authorized", false);

  logger.debug(`Getting label changes done, { data: ${JSON.stringify(data)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error getting label changes: ${error.message}`);
  }

  if (data.length === 0) {
    return null;
  }
  return data[0];
}
