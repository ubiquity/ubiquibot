import { createAdapters } from "../adapters";
import { processors, wildcardProcessors } from "../handlers/processors";
import { shouldSkip } from "../helpers";
import { BotContext, GithubEvent, Payload, PayloadSchema, LogLevel } from "../types";
import { Adapters } from "../types/adapters";
import { ajv } from "../utils";
import { loadConfig } from "./config";
import { GitHubLogger } from "../adapters/supabase";
import { validateConfigChange } from "../handlers/push";

let adapters: Adapters = {} as Adapters;
export const getAdapters = () => adapters;

export type Logger = {
  info: (msg: string | object, options?: JSON) => void;
  debug: (msg: string | object, options?: JSON) => void;
  warn: (msg: string | object, options?: JSON) => void;
  error: (msg: string | object, options?: JSON) => void;
};

let logger: Logger;
export const getLogger = (): Logger => logger;

const NO_VALIDATION = [GithubEvent.INSTALLATION_ADDED_EVENT as string, GithubEvent.PUSH_EVENT as string];

export const bindEvents = async (context: BotContext): Promise<void> => {
  const { id, name } = context;
  const payload = context.payload as Payload;
  const allowedEvents = Object.values(GithubEvent) as string[];
  const eventName = payload.action ? `${name}.${payload.action}` : name; // some events wont have actions as this grows

  let botConfigError;
  try {
    context.botConfig = await loadConfig(context);
  } catch (err) {
    botConfigError = err;
  }

  adapters = createAdapters(context.botConfig);

  const options = {
    app: "UbiquiBot",
    // level: botConfig.log.level,
  };

  logger = new GitHubLogger(
    context,
    options.app,
    context.botConfig?.log?.logEnvironment ?? "development",
    context.botConfig?.log?.level ?? LogLevel.DEBUG,
    context.botConfig?.log?.retryLimit ?? 0
  ); // contributors will see logs in console while on development env
  if (!logger) {
    return;
  }

  if (botConfigError) {
    logger.error(botConfigError.toString());
    if (eventName === GithubEvent.PUSH_EVENT) {
      await validateConfigChange(context);
    }
    return;
  }

  // Create adapters for telegram, supabase, twitter, discord, etc
  logger.info("Creating adapters for supabase, telegram, twitter, etc...");

  logger.info(
    `Config loaded! config: ${JSON.stringify({
      price: context.botConfig.price,
      unassign: context.botConfig.unassign,
      mode: context.botConfig.mode,
      log: context.botConfig.log,
      wallet: context.botConfig.wallet,
    })}`
  );

  logger.info(`Started binding events... id: ${id}, name: ${eventName}, allowedEvents: ${allowedEvents}`);

  if (!allowedEvents.includes(eventName)) {
    // just check if its on the watch list
    logger.info(`Skipping the event. reason: not configured`);
    return;
  }

  // Skip validation for installation event and push
  if (!NO_VALIDATION.includes(eventName)) {
    // Validate payload
    const validate = ajv.compile(PayloadSchema);
    const valid = validate(payload);
    if (!valid) {
      logger.info("Payload schema validation failed!!!", payload);
      if (validate.errors) logger.warn(validate.errors);
      return;
    }

    // Check if we should skip the event
    const { skip, reason } = shouldSkip(context);
    if (skip) {
      logger.info(`Skipping the event. reason: ${reason}`);
      return;
    }
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

  // Skip wildcard handlers for installation event and push event
  if (eventName !== GithubEvent.INSTALLATION_ADDED_EVENT && eventName !== GithubEvent.PUSH_EVENT) {
    // Run wildcard handlers
    logger.info(`Running wildcard handlers: ${wildcardProcessors.map((fn) => fn.name)}`);
    for (const wildcardProcessor of wildcardProcessors) {
      await wildcardProcessor();
    }
  }
};
