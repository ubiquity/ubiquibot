import Runtime from "../../../bindings/bot-runtime";
import { isUserAdminOrBillingManager } from "../../../helpers/issue";
import { Context } from "../../../types/context";
import { Payload } from "../../../types/payload";
import { taskPaymentMetaData } from "../../wildcard/analytics";

export async function authorizeLabelChanges(context: Context) {
  const runtime = Runtime.getState();
  const { label } = runtime.adapters.supabase;
  const logger = context.logger;
  const payload = context.event.payload as Payload;
  const sender = payload.sender.login;

  logger.info("Running '/authorize' command handler", { sender });

  const { issue, repository } = payload;
  if (!issue) {
    return logger.info(`Skipping '/authorize' because of no issue instance`);
  }

  // check if sender is admin
  // passing in context so we don't have to make another request to get the user
  const sufficientPrivileges = await isUserAdminOrBillingManager(context, sender);

  // if sender is not admin, return
  if (sufficientPrivileges) {
    throw logger.error(
      "User is not an admin/billing_manager and do not have the required permissions to access this function.",
      { sender }
    );
  }

  const task = taskPaymentMetaData(context, issue);

  if (!task.priceLabel || !task.priorityLabel || !task.timeLabel) {
    throw logger.error("Missing required labels", { issueDetailed: task });
  }

  // get current repository node id from payload and pass it to getLabelChanges function to get label changes
  const labelChanges = await label.getLabelChanges(repository.node_id);

  if (labelChanges) {
    // Approve label changes
    labelChanges.forEach(async (labelChange) => {
      await label.approveLabelChange(labelChange.id);
      return logger.info("Approved label change", { labelChange });
    });
  }

  return logger.ok("Label change has been approved, permit can now be generated");
}
