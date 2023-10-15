import Runtime from "../../bindings/bot-runtime";
import { addCommentToIssue, isUserAdminOrBillingManager, removeLabel, addLabelToIssue } from "../../helpers";
import { Payload, UserType } from "../../types";

export async function handleLabelsAccess() {
  const runtime = Runtime.getState();
  const { publicAccessControl } = runtime.botConfig;
  if (!publicAccessControl.setLabel) return true;

  const eventContext = runtime.eventContext;
  const logger = runtime.logger;

  const payload = eventContext.payload as Payload;

  if (!payload.issue) return;
  if (!payload.label?.name) return;
  if (payload.sender.type === UserType.Bot) return true;

  const sender = payload.sender.login;
  const repo = payload.repository;
  const sufficientPrivileges = await isUserAdminOrBillingManager(sender, eventContext);
  // event in plain english
  const eventName = payload.action === "labeled" ? "add" : "remove";
  const labelName = payload.label.name;

  // get text before :
  const match = payload.label?.name?.split(":");
  if (match.length == 0) return;
  const labelType = match[0].toLowerCase();
  if (sufficientPrivileges) {
    logger.info("Admin/Billing Manager has full control over all labels", {
      repo: repo.full_name,
      user: sender,
      labelType,
    });
    return true;
  } else {
    logger.info("Checking access for labels", { repo: repo.full_name, user: sender, labelType });
    // check permission
    const { access, user } = runtime.adapters.supabase;
    const userId = await user.getUserId(sender);
    const accessible = await access.getAccess(userId);
    if (accessible) {
      return true;
    }

    if (payload.action === "labeled") {
      // remove the label
      await removeLabel(labelName);
    } else if (payload.action === "unlabeled") {
      // add the label
      await addLabelToIssue(labelName);
    }
    await addCommentToIssue(`@${sender}, You are not allowed to ${eventName} ${labelName}`, payload.issue.number);
    logger.info("No access to edit label", { sender, label: labelName });
    return false;
  }
  return true;
}
