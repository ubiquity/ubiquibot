import Runtime from "../../bindings/bot-runtime";
import { hasLabelEditPermission } from "../../helpers";
import { Context, Payload } from "../../types";

export async function watchLabelChange(context: Context) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const payload = context.event.payload as Payload;
  const { label, changes, sender } = payload;

  const previousLabel = changes?.name?.from;
  if (!previousLabel) {
    throw logger.error(context.event, "previous label name is undefined");
  }
  const currentLabel = label?.name;
  const triggerUser = sender.login;

  if (!previousLabel || !currentLabel) {
    return logger.debug(context.event, "No label name change.. skipping");
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
  return logger.debug(context.event, "label name change saved to db");
}
