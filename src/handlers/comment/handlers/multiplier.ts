import { getAccessLevel, upsertWalletMultiplier } from "../../../adapters/supabase";
import { getBotContext, getLogger } from "../../../bindings";
import { getUserPermission } from "../../../helpers";
import { Payload } from "../../../types";

export const multiplier = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const repo = payload.repository;

  logger.info(`Received '/multiplier' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) {
    logger.info(`Skipping '/multiplier' because of no issue instance`);
    return;
  }

  const regex = /(".*?"|[^"\s]+)(?=\s*|\s*$)/g;

  const matches = body.match(regex);

  matches?.shift();

  if (matches) {
    let bountyMultiplier = 1;
    let username = "";
    let reason = "";

    for (const part of matches) {
      if (!isNaN(parseFloat(part))) {
        bountyMultiplier = parseFloat(part);
      } else if (part.startsWith("@")) {
        username = part.substring(1);
      } else {
        reason += part + " ";
      }
    }

    // check if sender is admin or billing_manager
    // passing in context so we don't have to make another request to get the user
    const permissionLevel = await getUserPermission(sender, context);

    // if sender is not admin or billing_manager, check db for access
    if (permissionLevel !== "admin" && permissionLevel !== "billing_manager") {
      logger.info(`Getting multiplier access for ${sender} on ${repo.full_name}`);
      // check db permission
      let accessible = await getAccessLevel(sender, repo.full_name, "multiplier");

      if (!accessible) {
        logger.info(`User ${sender} is not an admin or billing_manager`);
        return "Insufficient permissions to update the payout multiplier. You are not an `admin` or `billing_manager`";
      }
    }

    await upsertWalletMultiplier(username, bountyMultiplier?.toString());
    return `Successfully changed the payout multiplier for @${username} to ${bountyMultiplier}. The reason provided is ${reason}.`;
  } else {
    logger.error("Invalid body for bountyMultiplier command");
    return `Invalid body for bountyMultiplier command`;
  }
};
