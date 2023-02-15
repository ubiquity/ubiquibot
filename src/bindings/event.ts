import { Context } from "probot";
import { createAdapters } from "../adapters";
import { processors, wildcardProcessors } from "../handlers/processors";
import { shouldSkip } from "../helpers";
import { BotConfig, Payload, PayloadSchema } from "../types";
import { Adapters } from "../types/adapters";
import { ajv } from "../utils";
import { loadConfig } from "./config";

let botContext: Context = {} as Context;
export const getBotContext = () => botContext;

let botConfig: BotConfig = {} as BotConfig;
export const getBotConfig = () => botConfig;

let adapters: Adapters = {} as Adapters;
export const getAdapters = () => adapters;

const allowedEvents = [
  // issues events
  "issues.labeled",
  "issues.unlabeled",
  "issues.assigned",

  // issue_comment
  "issue_comment.created",
  "issue_comment.edited",
];

export const bindEvents = async (context: Context): Promise<void> => {
  const { log, id, name } = context;
  botContext = context;
  const payload = context.payload as Payload;

  log.info(`Started binding events... id: ${id}, name: ${name}, action: ${payload.action}}`);
  if (payload.action && !allowedEvents.includes(`${name}.${payload.action}`)) {
    log.debug(`Skipping the event. reason: not configured`);
    return;
  }

  // Load config
  log.info("Loading config from .env...");
  botConfig = await loadConfig();
  log.info(`Config loaded! config: ${JSON.stringify({ price: botConfig.price, unassign: botConfig.unassign, git: botConfig.git })}`);

  // Create adapters for telegram, supabase, twitter, discord, etc
  log.info("Creating adapters for supabase, telegram, twitter, etc...");
  adapters = createAdapters(botConfig);

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

  // Run wildcard handlers
  log.info(`Running wildcard handlers: ${wildcardProcessors.map((fn) => fn.name)}`);
  for (const wildcardProcessor of wildcardProcessors) {
    await wildcardProcessor();
  }
};
