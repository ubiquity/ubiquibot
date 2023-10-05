// import { getAllAccessLevels, getWalletInfo, upsertAccessControl } from "../../../adapters/supabase";
import { getAdapters, getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";

export async function query(body: string) {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  // const { repository, organization } = payload;

  // const id = organization?.id || repository?.id; // repository?.id as fallback

  logger.info(`Received '/query' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) return logger.info(`Skipping '/query' because of no issue instance`);

  const regex = /^\/query\s+@([\w-]+)\s*$/;
  const matches = body.match(regex);
  const username = matches?.[1];
  // const repo = payload.repository;

  if (username) {
    // Get access levels from the access table
    const database = getAdapters().supabase;
    // let accessData = await getAccessLevels(user, repo.full_name, id);

    // lookup user object from github api based on the username
    const { data: user } = await context.octokit.users.getByUsername({ username });
    if (!user) return logger.error(`No user found for username: ${username}`);

    const accessData = await database.access.getAccess(user.id);

    // Get wallet info from the users and wallets tables
    const walletAddress = await database.wallet.getAddress(user.id);

    let resultMessage = "";

    if (!accessData && !walletAddress) {
      return `No access or wallet information is set for @${user}`;
    }

    if (accessData) {
      const { multiplier, multiplier_reason, labels, location_id } = accessData;
      // const locationInfo = await await database.access.getAccessLocation(location_id);
      resultMessage += `@${user}'s access levels are set as follows:\n
  Multiplier: ${multiplier}\n
  Reason: ${multiplier_reason}\n
  Labels: ${JSON.stringify(labels)}\n
  \n\n`; // Original comment: ${locationInfo.node_url}
    }

    if (walletAddress) {
      // const { address, location_id } = walletData;
      // const locationInfo = await getLocationById(location_id);
      resultMessage += `@${user}'s wallet information is as follows:\n
  Address: ${walletAddress}\n`; //Original comment: ${locationInfo.node_url}\n
    }

    return resultMessage;
  }

  return logger.error("Invalid body for query command \n usage /query @user");
}
