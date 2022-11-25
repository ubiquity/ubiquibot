import { getBotContext } from "../bindings";
import { ActionHandler } from "../types";

export const nullHandler: ActionHandler = async (): Promise<void> => {
  // ToDo: This is just a null handler to do nothing. just needed for mockup
  // This would be replaced with the meaningful handler once its feature determined

  const { log } = getBotContext();
  log.debug(`Running handler, name: ${nullHandler.name}`);
};
