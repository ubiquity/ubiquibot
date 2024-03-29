import Runtime from "../../bindings/bot-runtime";
import { isUserAdminOrBillingManager, addLabelToIssue, addCommentToIssue } from "../../helpers/issue";
import { Context } from "../../types/context";
import { UserType } from "../../types/payload";

export async function labelAccessPermissionsCheck(context: Context) {
  const runtime = Runtime.getState();
  const { logger, payload } = context;
  const {
    features: { publicAccessControl },
  } = context.config;
  if (!publicAccessControl.setLabel) return true;

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
    const userId = await user.getUserId(context.event, sender);
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
async function removeLabel(context: Context, name: string) {
  const payload = context.payload;
  if (!payload.issue) {
    context.logger.debug("Invalid issue object");
    return;
  }

  try {
    await context.octokit.issues.removeLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      name: name,
    });
  } catch (e: unknown) {
    context.logger.fatal("Removing label failed!", e);
  }
}
