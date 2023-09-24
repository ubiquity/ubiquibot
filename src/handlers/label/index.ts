import { getBotContext, getLogger } from "../../bindings";
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

  if (!previousLabel) {
    logger.debug("watchLabelChange: No label name change.. skipping");
    return;
  }
};
