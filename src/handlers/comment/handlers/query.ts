import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";
import { getAdapters } from "../../../bindings";

export const query = async (body: string) => {
  const { supabase } = getAdapters()
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.info(`Received '/query' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) {
    logger.info(`Skipping '/query' because of no issue instance`);
    return;
  }

  const regex = /\S+\s+@(\S+)/;
  const matches = body.match(regex);
  const user = matches?.shift()
  if (user) {
    const { data: multiplierData, error: multiplierError } = await supabase.from('wallets').select('multiplier, address').eq("user_name", user).single();
    const multiplier = multiplierData ? multiplierData.multiplier : null;
    const address = multiplierData ? multiplierData.address : null;
    if (multiplierError){
      return  `Error retrieving multiplier and wallet address for @${user}`
    }
    return `@${user}'s wallet address is ${address} and  multiplier is ${multiplier}`
    
  } else {
    logger.error("Invalid body for query command");
    return `Invalid syntax for query command \n usage /query @user`;
  }
};
