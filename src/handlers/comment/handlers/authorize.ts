import { _approveLabelChange, getLabelChanges } from "../../../adapters/supabase";
import { getBotContext, getLogger } from "../../../bindings";
import { getUserPermission } from "../../../helpers";
import { Payload } from "../../../types";
import { ErrorDiff } from "../../../utils/helpers";
import { taskInfo } from "../../wildcard";

export const approveLabelChange = async () => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.info(`Received '/authorize' command from user: ${sender}`);

  const { issue, repository } = payload;
  if (!issue) {
    logger.info(`Skipping '/authorize' because of no issue instance`);
    return;
  }

  // check if sender is admin
  // passing in context so we don't have to make another request to get the user
  const permissionLevel = await getUserPermission(sender, context);

  // if sender is not admin, return
  if (permissionLevel !== "admin" && permissionLevel !== "billing_manager") {
    logger.info(`User ${sender} is not an admin/billing_manager`);
    return ErrorDiff(`You are not an admin/billing_manager and do not have the required permissions to access this function.`);
  }

  const issueDetailed = taskInfo(issue);

  if (!issueDetailed.priceLabel || !issueDetailed.priorityLabel || !issueDetailed.timelabel) {
    logger.info(`Skipping... its not a task`);
    return ErrorDiff(`No valid task label on this issue`);
  }

  // check for label altering here
  const labelChanges = await getLabelChanges(repository.full_name, [issueDetailed.priceLabel, issueDetailed.priorityLabel, issueDetailed.timelabel]);

  await _approveLabelChange(labelChanges.id);

  return `Label change has been approved, permit can now be generated`;
};
