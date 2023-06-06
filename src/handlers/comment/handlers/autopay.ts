import { getBotContext, getLogger } from "../../../bindings";
import { getUserPermission } from "../../../helpers";
import { Payload } from "../../../types";

export const autopay = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.info(`Received '/autopay' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) {
    logger.info(`Skipping '/autopay' because of no issue instance`);
    return;
  }

  const regex = /^\/autopay (true|false)$/;

  const matches = body.match(regex);

  if (matches) {
    let status = matches[1] === "true" ? "enabled" : "disabled";
    // check if sender is an admin
    // passing in context so we don't have to make another request to get the user
    const permissionLevel = await getUserPermission(sender, context);

    // if sender is not admin
    if (permissionLevel !== "admin") {
      logger.info(`User ${sender} is not an admin`);
      return "Insufficient permissions to update auto payout for this issue.";
    }

    return `Autopay is ${status} for issue #${issue?.number}`;
  } else {
    logger.error("Invalid body for autopay command");
    return `Invalid body for autopay command, ex: /autopay true|false`;
  }
};
