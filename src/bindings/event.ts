import { Context } from "probot";
import { createLogger } from "@logdna/logger";
import { createAdapters } from "../adapters";
import { processors, wildcardProcessors } from "../handlers/processors";
import { shouldSkip } from "../helpers";
import { BotConfig, GithubEvent, Payload, PayloadSchema } from "../types";
import { Adapters } from "../types/adapters";
import { ajv } from "../utils";
import { loadConfig } from "./config";

let botContext: Context = {} as Context;
export const getBotContext = () => botContext;

let botConfig: BotConfig = {} as BotConfig;
export const getBotConfig = () => botConfig;

let adapters: Adapters = {} as Adapters;
export const getAdapters = () => adapters;

let logger: any;
export const getLogger = () => logger!;

export const bindEvents = async (context: Context): Promise<void> => {
  const { id, name } = context;
  botContext = context;
  const payload = context.payload as Payload;

  botConfig = await loadConfig();
  logger.info(`Config loaded! config: ${JSON.stringify({ price: botConfig.price, unassign: botConfig.unassign, mode: botConfig.mode, log: botConfig.log })}`);

  const options = {
    app: "UbiquiBot",
    level: botConfig.log.level,
  };
  logger = createLogger(botConfig.log.ingestionKey, options);
  if (!logger) {
    return;
  }

  const allowedEvents = Object.values(GithubEvent) as string[];
  const eventName = `${name}.${payload.action}`;
  logger.info(`Started binding events... id: ${id}, name: ${eventName}, allowedEvents: ${allowedEvents}`);
  if (payload.action && !allowedEvents.includes(eventName)) {
    logger.info(`Skipping the event. reason: not configured`);
    return;
  }

  // Create adapters for telegram, supabase, twitter, discord, etc
  logger.info("Creating adapters for supabase, telegram, twitter, etc...");
  adapters = createAdapters(botConfig);

  // Validate payload
  const validate = ajv.compile(PayloadSchema);
  const valid = validate(payload);
  if (!valid) {
    logger.info("Payload schema validation failed!!!", payload);
    logger.warn(validate.errors!);
    return;
  }

  // Check if we should skip the event
  const { skip, reason } = shouldSkip();
  if (skip) {
    logger.info(`Skipping the event. reason: ${reason}`);
    return;
  }

  // Get the handlers for the action
  const handlers = processors[eventName];
  if (!handlers) {
    logger.warn(`No handler configured for event: ${eventName}`);
    return;
  }

  const { pre, action, post } = handlers;
  // Run pre-handlers
  logger.info(`Running pre handlers: ${pre.map((fn) => fn.name)}, event: ${eventName}`);
  for (const preAction of pre) {
    await preAction();
  }
  // Run main handlers
  logger.info(`Running main handlers: ${action.map((fn) => fn.name)}, event: ${eventName}`);
  for (const mainAction of action) {
    await mainAction();
  }

  // Run post-handlers
  logger.info(`Running post handlers: ${post.map((fn) => fn.name)}, event: ${eventName}`);
  for (const postAction of post) {
    await postAction();
  }

  // Run wildcard handlers
  logger.info(`Running wildcard handlers: ${wildcardProcessors.map((fn) => fn.name)}`);
  for (const wildcardProcessor of wildcardProcessors) {
    await wildcardProcessor();
  }
};
