import Runtime from "../../../bindings/bot-runtime";
import { isUserAdminOrBillingManager } from "../../../helpers";
import { Payload } from "../../../types";
/**
 * You can use this command to set a multiplier for a user.
 * It will accept arguments in any order.
 * Example usage:
 *
 * /multiplier @user 0.5 "Multiplier reason"
 * /multiplier 0.5 @user "Multiplier reason"
 * /multiplier "Multiplier reason" @user 0.5
 * /multiplier 0.5 "Multiplier reason" @user
 * /multiplier @user "Multiplier reason" 0.5
 **/
export async function multiplier(body: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  const sender = payload.sender.login;
  const repo = payload.repository;
  const comment = payload.comment;

  if (!comment) return logger.info(`Skipping '/multiplier' because of no comment instance`);

  const issue = payload.issue;

  logger.info(`Received '/multiplier' command from user: ${sender}`);

  if (!issue) return logger.info(`Skipping '/multiplier' because of no issue instance`);

  const regex = /(".*?"|[^"\s]+)(?=\s*|\s*$)/g;

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
    const sufficientPrivileges = await isUserAdminOrBillingManager(sender, context);

    // if sender is not admin or billing_manager, check db for access
    if (sufficientPrivileges) {
      logger.info(`Getting multiplier access for ${sender} on ${repo.full_name}`);
      // check db permission
      // await getMultiplier(sender.id, repo.id);
      const accessible = await getAccessLevel(
        payload.sender.id
        // , repo.full_name, "multiplier"
      );

      if (!accessible) {
        return logger.warn(
          `Insufficient permissions to update the payout multiplier. ${sender} is not an 'admin' or 'billing_manager'`
        );
      }
    }
    logger.info(
      `Upserting to the wallet table, username: ${username}, taskMultiplier: ${taskMultiplier}, reason: ${reason}}`
    );

    const { access } = Runtime.getState().adapters.supabase;
    await access.upsertMultiplier(payload.sender.id, taskMultiplier, reason, comment);

    if (taskMultiplier > 1) {
      return `Successfully changed the payout multiplier for @${username} to ${taskMultiplier}. The reason ${
        reason ? `provided is "${reason}"` : "is not provided"
      }. This feature is designed to limit the contributor's compensation for any task on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a price multiplier above 1?`;
    } else {
      return `Successfully changed the payout multiplier for @${username} to ${taskMultiplier}. The reason ${
        reason ? `provided is "${reason}"` : "is not provided"
      }.`;
    }
  } else {
    logger.error("Invalid body for taskMultiplier command");
    return `Invalid syntax for wallet command \n example usage: "/multiplier @user 0.5 'Multiplier reason'"`;
  }
}

async function getAccessLevel(userId: number) {
  const { access } = Runtime.getState().adapters.supabase;
  return await access.getAccess(userId);
}
