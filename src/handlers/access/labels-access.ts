import Runtime from "../../bindings/bot-runtime";
import { addCommentToIssue, isUserAdminOrBillingManager, removeLabel, addLabelToIssue } from "../../helpers";
import { Context, Payload, UserType } from "../../types";

export async function labelAccessPermissionsCheck(context: Context) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const {
    features: { publicAccessControl },
  } = context.config;
  if (!publicAccessControl.setLabel) return true;

  const payload = context.event.payload as Payload;
  if (!payload.issue) return;
  if (!payload.label?.name) return;
  if (payload.sender.type === UserType.Bot) return true;

  const sender = payload.sender.login;
  const repo = payload.repository;
  const sufficientPrivileges = await isUserAdminOrBillingManager(context, sender);
  // event in plain english
  const eventName = payload.action === "labeled" ? "add" : "remove";
  const labelName = payload.label.name;

  // get text before :
  const match = payload.label?.name?.split(":");
  if (match.length == 0) return;
  const labelType = match[0].toLowerCase();

  if (sufficientPrivileges) {
    logger.info("Admin and billing managers have full control over all labels", {
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

    console.trace({ "payload.action": payload.action });

    if (payload.action === "labeled") {
      // remove the label
      await removeLabel(context, labelName);
    } else if (payload.action === "unlabeled") {
      // add the label
      await addLabelToIssue(context, labelName);
    }
    await addCommentToIssue(
      context,
      `@${sender}, You are not allowed to ${eventName} ${labelName}`,
      payload.issue.number
    );
    logger.info("No access to edit label", { sender, label: labelName });
    return false;
  }
}
