import { getAccessLevel, getWalletInfo } from "../../../adapters/supabase";
import { getBotContext, getLogger } from "../../../bindings";
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
  const repo = payload.repository;

  if (user) {
    const walletInfo = await getWalletInfo(user, id?.toString());
    if (!walletInfo?.address) {
      return `Error retrieving multiplier and wallet address for @${user}`;
    } else {
      return `@${user}'s wallet address is ${walletInfo?.address}, multiplier is ${walletInfo?.multiplier} and access levels are
| access type | access level |
| ----------- | ------------ |access type 	access level
multiplier 	true
priority 	true
time 	true
price 	true
| multiplier  | ${getAccessLevel(sender, repo.full_name, "multiplier")}       |
| priority    | ${getAccessLevel(sender, repo.full_name, "priority")}         |
| time        | ${getAccessLevel(sender, repo.full_name, "time")}             |
| price       | ${getAccessLevel(sender, repo.full_name, "price")}            |`;
    }
  } else {
    logger.error("Invalid body for query command");
    return `Invalid syntax for query command \n usage /query @user`;
  }
};
