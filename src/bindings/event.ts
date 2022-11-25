import { Context } from "probot";

export const bindEvents = async (context: Context): Promise<void> => {
  const { payload, log, id, name} = context;
  if (context.isBot) {
    log.debug(`Skipping because the actor is a bot`);
    return;
  } 

  log.info(`Started binding events... id: ${id}, name: ${name}`);
  

};
