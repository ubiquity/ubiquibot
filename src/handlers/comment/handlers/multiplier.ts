import Runtime from "../../../bindings/bot-runtime";
import { isUserAdminOrBillingManager } from "../../../helpers/issue";
import { Context } from "../../../types/context";
import { Payload } from "../../../types/payload";

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
export async function multiplier(context: Context, body: string) {
  const logger = context.logger;
  const payload = context.event.payload as Payload;
  const sender = payload.sender.login;
  const repo = payload.repository;
  const comment = payload.comment;
  if (!comment) return context.logger.info(`Skipping '/multiplier' because of no comment instance`);
  const issue = payload.issue;
  context.logger.info("Running '/multiplier' command handler", { sender });
  if (!issue) return context.logger.info(`Skipping '/multiplier' because of no issue instance`);
  const regex = /(".*?"|[^"\s]+)(?=\s*|\s*$)/g;
  const matches = body.match(regex);
  matches?.shift();

  if (matches) {
    let taskMultiplier = 1;
    let username;
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
    const sufficientPrivileges = await isUserAdminOrBillingManager(context, sender);

    // if sender is not admin or billing_manager, check db for access
    if (sufficientPrivileges) {
      context.logger.info("Getting multiplier access", {
        repo: repo.full_name,
        user: sender,
      });

      // check db permission
      // await getMultiplier(sender.id, repo.id);
      const accessible = await getAccessLevel(
        payload.sender.id
        // , repo.full_name, "multiplier"
      );

      if (!accessible) {
        return logger.error(
          "Insufficient permissions to update the payout multiplier. User is not an 'admin' or 'billing_manager'",
          {
            repo: repo.full_name,
            user: sender,
          }
        );
      }
    }
    context.logger.info("Upserting to the wallet table", { username, taskMultiplier, reason });

    const { access } = Runtime.getState().adapters.supabase;
    await access.upsertMultiplier(payload.sender.id, taskMultiplier, reason, comment);

    if (taskMultiplier > 1) {
      return logger.ok(
        "Successfully changed the payout multiplier. \
        This feature is designed to limit the contributor's compensation \
        for any task on the current repository \
        due to other compensation structures (i.e. salary.) \
        are you sure you want to use a price multiplier above 1?",
        {
          username,
          taskMultiplier,
          reason,
        }
      );
    } else {
      return context.logger.ok("Successfully changed the payout multiplier", {
        username,
        taskMultiplier,
        reason,
      });
    }
  } else {
    return logger.fatal(
      "Invalid body for taskMultiplier command. Example usage: /multiplier @user 0.5 'Multiplier reason'"
    );
  }
}

async function getAccessLevel(userId: number) {
  const { access } = Runtime.getState().adapters.supabase;
  return await access.getAccess(userId);
}
