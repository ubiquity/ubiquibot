import { getLogger } from "../../bindings";
import { ActionHandler } from "../../types";

export const nullHandler: ActionHandler = async (): Promise<void> => {
  // ToDo: This is just a null handler to do nothing. just needed for mockup
  // This would be replaced with the meaningful handler once its feature determined

  const logger = getLogger();
  logger.debug(`Running handler, name: ${nullHandler.name}`);
};
