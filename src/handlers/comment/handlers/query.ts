import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";
import { getWalletAddress, getWalletMultiplier } from "../../../adapters/supabase";

export const multiplier = async (body: string) => {
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
    const walletAddress = getWalletAddress(user)
    const multiplier = getWalletMultiplier(user)
    return `@${user}'s wallet address is ${walletAddress} and  multiplier is ${multiplier}`
    
  } else {
    logger.error("Invalid body for query command");
    return `Invalid syntax for query command \n usage /query @user`;
  }
};
