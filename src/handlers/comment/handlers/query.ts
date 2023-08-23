import { getWalletInfo } from "../../../adapters/supabase";
import { getBotContext, getLogger } from "../../../bindings";
import { getUser } from "../../../helpers";
import { Payload } from "../../../types";

export const query = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const { repository, organization } = payload;

  const id = organization?.id || repository?.id; // repository?.id as fallback

  logger.info(`Received '/query' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) {
    logger.info(`Skipping '/query' because of no issue instance`);
    return `Skipping '/query' because of no issue instance`;
  }

  const regex = /^\/query\s+@([\w-]+)\s*$/;
  const matches = body.match(regex);
  const user = matches?.[1];
  getUser;

  if (user) {
    const { id: user_id } = (await getUser(user)) ?? {};
    const walletInfo = await getWalletInfo(user, id?.toString(), user_id || 0);
    if (!walletInfo?.address) {
      return `Error retrieving multiplier and wallet address for @${user}`;
    } else {
      return `@${user}'s wallet address is ${walletInfo?.address} and  multiplier is ${walletInfo?.multiplier}`;
    }
  } else {
    logger.error("Invalid body for query command");
    return `Invalid syntax for query command \n usage /query @user`;
  }
};
