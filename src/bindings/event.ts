import { Context } from "probot";
import { processors } from "../handlers/event";
import { shouldSkip } from "../helpers";
import { PayloadSchema } from "../types";
import { ajv } from "../utils";

let BotContext: Context = {} as Context;
export const getBotContext = () => BotContext;

export const bindEvents = async (context: Context): Promise<void> => {
  BotContext = context;
  const { payload, log, id, name } = context;

  log.info(`Started binding events... id: ${id}, name: ${name}`);

  const validate = ajv.compile(PayloadSchema);
  const valid = validate(payload);
  if (!valid) {
    log.info("Payload schema validation failed!!!", payload);
    log.error(validate.errors!);
    return;
  }
  const { skip, reason } = shouldSkip();
  if (skip) {
    log.info(`Skipping the event. reason: ${reason}`);
    return;
  }

  const handlers = processors[payload.action];
  if (!handlers) {
    log.error(`No handler configured for action: ${payload.action}`);
    return;
  }

  const { pre, action, post } = handlers;
  // Run pre-handlers
  log.info(`Running pre handlers: ${pre.map((fn) => fn.name)}, action: ${payload.action}`);
  for (const preAction of pre) {
    await preAction();
  }
  // Run main handlers
  log.info(`Running main handlers: ${action.map((fn) => fn.name)}, action: ${payload.action}`);
  for (const mainAction of action) {
    await mainAction();
  }

  // Run post-handlers
  log.info(`Running post handlers: ${post.map((fn) => fn.name)}, action: ${payload.action}`);
  for (const postAction of post) {
    await postAction();
  }
};
