import { upsertAccessControl } from "../../../adapters/supabase";
import { getBotContext, getLogger } from "../../../bindings";
import { getUserPermission } from "../../../helpers";
import { Payload } from "../../../types";

export const setAccess = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const user_id = payload.sender.id;

  const validAccessString = ["priority", "time", "price", "multiplier"];

  logger.info(`Received '/allow' command from user: ${sender}`);

  const issue = payload.issue;
  const repo = payload.repository;
  if (!issue) {
    logger.info(`Skipping '/allow' because of no issue instance`);
    return;
  }

  const regex = /^\/allow set-(\S+)\s@(\w+)\s(true|false)$/;

  const matches = body.match(regex);

  if (matches) {
    const [, accessType, username, bool] = matches;

    // Check if access control demand is valid
    if (!validAccessString.includes(accessType)) {
      logger.info(`Access control setting for ${accessType} does not exist.`);
      return `Access control setting for ${accessType} does not exist.`;
    }

    // check if sender is admin
    // passing in context so we don't have to make another request to get the user
    const permissionLevel = await getUserPermission(sender, context);

    // if sender is not admin, return
    if (permissionLevel !== "admin") {
      logger.info(`User ${sender} is not an admin`);
      return `You are not an admin and do not have the required permissions to access this function.`;
    }

    // convert accessType to valid table
    const tableName = `${accessType}_access`;

    await upsertAccessControl(username, repo.full_name, tableName, bool === "true", user_id, repo.id);
    return `Updated access for @${username} successfully!\t Access: **${accessType}** for "${repo.full_name}"`;
  } else {
    logger.error("Invalid body for allow command");
    return `Invalid syntax for allow \n usage: '/allow set-(access type) @user true|false' \n  ex-1 /allow set-multiplier @user false`;
  }
};
