import { Context } from "probot";
import { processors } from "../handlers/processors";
import { shouldSkip } from "../helpers";
import { BotConfig, Payload, PayloadSchema } from "../types";
import { ajv } from "../utils";
import { loadConfig } from "./config";

let botContext: Context = {} as Context;
export const getBotContext = () => botContext;

let botConfig: BotConfig = {} as BotConfig;
export const getBotConfig = () => botConfig;

const allowedActions = ["labeled", "unlabeled"];

export const bindEvents = async (context: Context): Promise<void> => {
  const { log, id, name } = context;
  botContext = context;
  const payload = context.payload as Payload;

  log.info(`Started binding events... id: ${id}, name: ${name}, action: ${payload.action}}`);
  if (payload.action && !allowedActions.includes(payload.action)) {
    log.debug(`Skipping the event. reason: not configured`);
    return;
  }

  // Load config
  log.info("Loading config from .env...");
  botConfig = await loadConfig();

  // Validate payload
  const validate = ajv.compile(PayloadSchema);
  const valid = validate(payload);
  if (!valid) {
    log.info("Payload schema validation failed!!!", payload);
    log.warn(validate.errors!);
    return;
  }

  // Check if we should skip the event
  const { skip, reason } = shouldSkip();
  if (skip) {
    log.info(`Skipping the event. reason: ${reason}`);
    return;
  }

  const actionName = payload.action ?? name;

  // Get the handlers for the action
  const handlers = processors[actionName];
  if (!handlers) {
    log.warn(`No handler configured for action: ${actionName}`);
    return;
  }

  const { pre, action, post } = handlers;
  // Run pre-handlers
  log.info(`Running pre handlers: ${pre.map((fn) => fn.name)}, action: ${actionName}`);
  for (const preAction of pre) {
    await preAction();
  }
  // Run main handlers
  log.info(`Running main handlers: ${action.map((fn) => fn.name)}, action: ${actionName}`);
  for (const mainAction of action) {
    await mainAction();
  }

  // Run post-handlers
  log.info(`Running post handlers: ${post.map((fn) => fn.name)}, action: ${actionName}`);
  for (const postAction of post) {
    await postAction();
  }
};
