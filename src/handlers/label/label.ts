import Runtime from "../../bindings/bot-runtime";
import { hasLabelEditPermission } from "../../helpers/payout";
import { Context } from "../../types/context";
import { GitHubPayload } from "../../types/payload";

export async function watchLabelChange(context: Context) {
  const logger = context.logger;

  const payload = context.event.payload as GitHubPayload;
  const { label, changes, sender } = payload;

  const previousLabel = changes?.name?.from;
  if (!previousLabel) {
    throw logger.error("previous label name is undefined");
  }
  const currentLabel = label?.name;
  const triggerUser = sender.login;

  if (!previousLabel || !currentLabel) {
    return logger.debug("No label name change.. skipping");
  }

  // check if user is authorized to make the change
  const hasAccess = await hasLabelEditPermission(context, currentLabel, triggerUser);

  const { supabase } = Runtime.getState().adapters;

  await supabase.label.saveLabelChange({
    previousLabel,
    currentLabel,
    authorized: hasAccess,
    repository: payload.repository,
  });
  return logger.debug("label name change saved to db");
}
