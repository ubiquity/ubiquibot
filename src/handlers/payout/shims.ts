import Decimal from "decimal.js";
import Runtime from "../../bindings/bot-runtime";
import { Comment } from "../../types";
interface RemovePenalty {
  userId: number;
  amount: Decimal;
  node: Comment;
}
export async function removePenalty({ userId, amount, node }: RemovePenalty) {
  const { supabase } = Runtime.getState().adapters;
  // const logger = runtime.logger;

  await supabase.settlement.addCredit({
    userId: userId,
    amount: amount,
    comment: node,
    // networkId: 1,
    // organization: {
    //   login: "test",
    // },
    // networkId: networkId,
    // address: tokenAddress,
  });

  // if (error) {
  //   throw new Error(`Error removing penalty: ${error.message}`);
  // }
}

//
