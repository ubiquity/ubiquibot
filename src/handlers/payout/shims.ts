import Decimal from "decimal.js";
import { getAdapters } from "../../bindings/event";
import { Comment } from "../../types";
interface RemovePenalty {
  userId: number;
  amount: Decimal;
  node: Comment;
  networkId: number;
  tokenAddress: string;
}
export async function removePenalty({ userId, amount, node, networkId, tokenAddress }: RemovePenalty): Promise<void> {
  const { supabase } = getAdapters();
  // const logger = getLogger();

  await supabase.settlement.addCredit({
    userId: userId,
    amount: amount,
    comment: node,
    // networkId: networkId,
    // address: tokenAddress,
  });

  // logger.debug(`Removing penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  // if (error) {
  //   throw new Error(`Error removing penalty: ${error.message}`);
  // }
}

//
