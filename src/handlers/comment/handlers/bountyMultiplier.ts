import { getBotContext, getLogger } from "../../../bindings";
import { addCommentToIssue, getUserPermission } from "../../../helpers";
import { Payload } from "../../../types";

export const bountyMultiplier = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.info(`Received '/bountyMultiplier' command from user: ${sender}`);

  const issue = payload.issue;
  if (!issue) {
    logger.info(`Skipping '/bountyMultiplier' because of no issue instance`);
    return;
  }

  const regex = /\/bountyMultiplier @(\w+) (\d+\.\d+)/; // /bountyMultiplier @0xcodercrane 0.5

  const matches = body.match(regex);

  if (matches) {
    const username = matches[1];
    const bountyMultiplier = parseFloat(matches[2]);

    // check if sender is admin or billing_manager
    // passing in context so we don't have to make another request to get the user
    const permissionLevel = await getUserPermission(username, context);

    // if sender is not admin or billing_manager, return
    if (permissionLevel !== "admin" && permissionLevel !== "billing_manager") {
      logger.info(`User ${sender} is not an admin or billing_manager`);
      addCommentToIssue(`Oops!, You are not an admin or billing_manager`, issue.number as number);
      return;
    }

    console.log(username, bountyMultiplier, permissionLevel);
  } else {
    logger.error("Invalid body for bountyMultiplier command");
  }
};
