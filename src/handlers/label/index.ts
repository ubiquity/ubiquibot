import { saveLabelChange } from "../../adapters/supabase";
import { getBotContext, getLogger } from "../../bindings";
import { hasLabelEditPermission } from "../../helpers";
import { Payload } from "../../types";

export const watchLabelChange = async () => {
  const logger = getLogger();
  const context = getBotContext();

  const payload = context.payload as Payload;

  const { repository, label, changes, sender } = payload;

  const { full_name } = repository;

  const previousLabel = changes?.name.from;
  const currentLabel = label?.name;
  const triggerUser = sender.login;

  if (!previousLabel || !currentLabel) {
    logger.debug("watchLabelChange: No label name change.. skipping");
    return;
  }

  // check if user is authorized to make the change
  let hasAccess = await hasLabelEditPermission(currentLabel, triggerUser, repository.full_name);

  await saveLabelChange(triggerUser, full_name, previousLabel, currentLabel, hasAccess);
  logger.debug("watchLabelChange: label name change saved to db");
};
