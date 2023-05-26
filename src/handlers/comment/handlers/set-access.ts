import { upsertAccessControl } from "../../../adapters/supabase";
import { getBotContext, getLogger } from "../../../bindings";
import { getUserPermission } from "../../../helpers";
import { Payload } from "../../../types";

export const setAccess = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

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
      logger.info(`Access Control setup for ${accessType} doesn't exist`);
      return `Access Control setup for ${accessType} doesn't exist`;
    }

    // check if sender is admin
    // passing in context so we don't have to make another request to get the user
    const permissionLevel = await getUserPermission(sender, context);

    // if sender is not admin, return
    if (permissionLevel !== "admin") {
      logger.info(`User ${sender} is not an admin or billing_manager`);
      return `Oops!, You are not an admin or billing_manager`;
    }

    // convert accessType to valid table
    const tableName = `${accessType}_access`;

    await upsertAccessControl(username, repo.full_name, tableName, bool === "true");
    return `Updated access for @${username} successfully!\t Access: **${accessType}** for "${repo.full_name}"`;
  } else {
    logger.error("Invalid body for allow command");
    return `Invalid body for allow command`;
  }
};
