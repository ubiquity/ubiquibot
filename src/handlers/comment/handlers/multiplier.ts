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
  const { repository, organization } = payload;

  const id = organization?.id || repository?.id; // repository?.id as fallback

  logger.info(`Received '/multiplier' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) {
    logger.info(`Skipping '/multiplier' because of no issue instance`);
    return `Skipping '/multiplier' because of no issue instance`;
  }

  const regex = /(".*?"|[^"\s]+)(?=\s*|\s*$)/g;
  /** You can use this command to set a multiplier for a user.
   * It will accept arguments in any order.
   * Example usage:
   *
   * /multiplier @user 0.5 "Multiplier reason"
   * /multiplier 0.5 @user "Multiplier reason"
   * /multiplier "Multiplier reason" @user 0.5
   * /multiplier 0.5 "Multiplier reason" @user
   * /multiplier @user "Multiplier reason" 0.5
   *
   **/

  const matches = body.match(regex);

  matches?.shift();

  if (matches) {
    let taskMultiplier = 1;
    let username = "";
    let reason = "";

    for (const part of matches) {
      if (!isNaN(parseFloat(part))) {
        taskMultiplier = parseFloat(part);
      } else if (part.startsWith("@")) {
        username = part.substring(1);
      } else {
        reason += part.replace(/['"]/g, "");
      }
    }
    username = username || sender;
    // check if sender is admin or billing_manager
    // passing in context so we don't have to make another request to get the user
    const permissionLevel = await getUserPermission(sender, context);

    // if sender is not admin or billing_manager, check db for access
    if (permissionLevel !== "admin" && permissionLevel !== "billing_manager") {
      logger.info(`Getting multiplier access for ${sender} on ${repo.full_name}`);
      // check db permission
      const accessible = await getAccessLevel(sender, repo.full_name, "multiplier");

      if (!accessible) {
        logger.info(`User ${sender} is not an admin or billing_manager`);
        return "Insufficient permissions to update the payout multiplier. You are not an `admin` or `billing_manager`";
      }
    }
    logger.info(`Upserting to the wallet table, username: ${username}, taskMultiplier: ${taskMultiplier}, reason: ${reason}}`);

    await upsertWalletMultiplier(username, taskMultiplier?.toString(), reason, id?.toString());
    if (taskMultiplier > 1) {
      return `Successfully changed the payout multiplier for @${username} to ${taskMultiplier}. The reason ${
        reason ? `provided is "${reason}"` : "is not provided"
      }. This feature is designed to limit the contributor's compensation for any bounty on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a bounty multiplier above 1?`;
    } else {
      return `Successfully changed the payout multiplier for @${username} to ${taskMultiplier}. The reason ${
        reason ? `provided is "${reason}"` : "is not provided"
      }.`;
    }
  } else {
    logger.error("Invalid body for taskMultiplier command");
    return `Invalid syntax for wallet command \n example usage: "/multiplier @user 0.5 'Multiplier reason'"`;
  }
};
