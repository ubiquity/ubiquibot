import { saveLabelChange } from "../../adapters/supabase";
import { getBotContext, getLogger, logFnName } from "../../bindings";
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
    logger.debug("No label name change.. skipping", logFnName);
    return;
  }

  // check if user is authorized to make the change
  const hasAccess = await hasLabelEditPermission(currentLabel, triggerUser, repository.full_name);

  await saveLabelChange(triggerUser, full_name, previousLabel, currentLabel, hasAccess);
  logger.debug("label name change saved to db", logFnName);
};
