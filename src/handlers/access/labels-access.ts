import { getAccessLevel } from "../../adapters/supabase";
import { getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, getUserPermission, removeLabel, addLabelToIssue } from "../../helpers";
import { Payload } from "../../types";

export const handleLabelsAccess = async () => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  if (!payload.issue) return;
  const sender = payload.sender.login;

  const repo = payload.repository;

  const permissionLevel = await getUserPermission(sender, context);

  // event in plain english
  const eventName = payload.action === "labeled" ? "add" : "remove";

  // get text before :
  const match = payload.label?.name?.split(":");

  const label_type = match![0]?.toLowerCase();

  if (permissionLevel !== "admin") {
    logger.info(`Getting ${label_type} access for ${sender} on ${repo.full_name}`);
    // check permission
    const accessible = await getAccessLevel(sender, repo.full_name, label_type);

    if (accessible) {
      return true;
    }

    if (payload.action === "labeled") {
      // remove the label
      removeLabel(payload.label?.name!);
    } else if (payload.action === "unlabeled") {
      // add the label
      addLabelToIssue(payload.label?.name!);
    }
    addCommentToIssue(`@${sender}, You are not allowed to ${eventName} ${payload.label?.name!}`, payload.issue.number);
    logger.info(`@${sender} is not allowed to ${eventName} ${payload.label?.name!}`);
    return false;
  }
  return true;
};
