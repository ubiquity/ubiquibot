// import { getAccessLevel } from "../../adapters/supabase";
import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, getUserPermission, removeLabel, addLabelToIssue } from "../../helpers";
import { Payload, UserType } from "../../types";
import { getAdapters } from "../../bindings/event";

export const handleLabelsAccess = async () => {
  const { publicAccessControl } = getBotConfig();
  if (!publicAccessControl.setLabel) return true;

  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  if (!payload.issue) return;
  if (!payload.label?.name) return;
  if (payload.sender.type === UserType.Bot) return true;

  const sender = payload.sender.login;
  const repo = payload.repository;
  const permissionLevel = await getUserPermission(sender, context);
  // event in plain english
  const eventName = payload.action === "labeled" ? "add" : "remove";
  const labelName = payload.label.name;

  // get text before :
  const match = payload.label?.name?.split(":");
  if (match.length == 0) return;
  const label_type = match[0].toLowerCase();
  if (permissionLevel !== "admin") {
    logger.info(`Getting ${label_type} access for ${sender} on ${repo.full_name}`);
    // check permission
    const { access, user } = getAdapters().supabase;
    const userId = await user.getUserId(sender);
    const accessible = await access.getAccess(userId);
    // const accessible = await access.getAccessLevel(sender, repo.full_name, label_type);

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
    logger.info(`@${sender} is not allowed to ${eventName} ${labelName}`);
    return false;
  }
  return true;
};
