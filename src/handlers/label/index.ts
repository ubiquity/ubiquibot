import Runtime from "../../bindings/bot-runtime";
import { hasLabelEditPermission } from "../../helpers";
import { Payload } from "../../types";

export const watchLabelChange = async () => {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const context = runtime.eventContext;

  const payload = context.payload as Payload;

  const { label, changes, sender } = payload;

  const previousLabel = changes?.name.from;
  const currentLabel = label?.name;
  const triggerUser = sender.login;

  if (!previousLabel || !currentLabel) {
    logger.debug("watchLabelChange: No label name change.. skipping");
    return;
  }

  // check if user is authorized to make the change
  const hasAccess = await hasLabelEditPermission(currentLabel, triggerUser);

  const { supabase } = Runtime.getState().adapters;

  await supabase.label.saveLabelChange({
    previousLabel,
    currentLabel,
    authorized: hasAccess,
    repository: payload.repository,
  });
  logger.debug("watchLabelChange: label name change saved to db");
};
