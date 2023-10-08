import { Context } from "probot";
import { createAdapters } from "../adapters";
import { GitHubLogger } from "../adapters/supabase";
import { processors, wildcardProcessors } from "../handlers/processors";
import { validateConfigChange } from "../handlers/push";
import { shouldSkip } from "../helpers";
import { GithubEvent, LogLevel, Payload, PayloadSchema } from "../types";
import { ajv } from "../utils";
import { loadConfig } from "./config";

import Runtime from "./bot-runtime";

const NO_VALIDATION = [GithubEvent.INSTALLATION_ADDED_EVENT, GithubEvent.PUSH_EVENT] as string[];

export async function bindEvents(context: Context): Promise<void> {
  const runtime = Runtime.getState();

  const { id, name } = context;
  runtime.eventContext = context;
  const payload = context.payload as Payload;
  const allowedEvents = Object.values(GithubEvent) as string[];
  const eventName = payload.action ? `${name}.${payload.action}` : name; // some events wont have actions as this grows

  let botConfigError;
  try {
    runtime.botConfig = await loadConfig(context);
  } catch (err) {
    botConfigError = err;
  }

  runtime.adapters = createAdapters(runtime.botConfig);
  runtime.logger = new GitHubLogger(
    // contributors will see logs in console while on development environment
    runtime.botConfig?.log?.logEnvironment ?? "development",
    runtime.botConfig?.log?.level ?? LogLevel.DEBUG,
    runtime.botConfig?.log?.retryLimit ?? 0
    // botConfig.logNotification
  );
  if (!runtime.logger) {
    return;
  }

  if (botConfigError) {
    runtime.logger.error(botConfigError.toString());
    if (eventName === GithubEvent.PUSH_EVENT) {
      await validateConfigChange();
    }
    return;
  }

  // Create adapters for supabase, twitter, discord, etc
  runtime.logger.info("Creating adapters for supabase, twitter, etc...");
  runtime.logger.info(`Config loaded! config: ${JSON.stringify(runtime.botConfig)}`);
  runtime.logger.info(`Started binding events... id: ${id}, name: ${eventName}, allowedEvents: ${allowedEvents}`);

  if (!allowedEvents.includes(eventName)) {
    // just check if its on the watch list
    runtime.logger.info(`Skipping the event. reason: not configured`);
    return;
  }

  // Skip validation for installation event and push
  if (!NO_VALIDATION.includes(eventName)) {
    // Validate payload
    const validate = ajv.compile(PayloadSchema);
    const valid = validate(payload);
    if (!valid) {
      runtime.logger.info("Payload schema validation failed!", payload);
      if (validate.errors) runtime.logger.warn(validate.errors);
      return;
    }

    // Check if we should skip the event
    const { skip, reason } = shouldSkip();
    if (skip) {
      runtime.logger.info(`Skipping the event. reason: ${reason}`);
      return;
    }
  }

  // Get the handlers for the action
  const handlers = processors[eventName];
  if (!handlers) {
    runtime.logger.warn(`No handler configured for event: ${eventName}`);
    return;
  }

  const { pre, action, post } = handlers;
  // Run pre-handlers
  runtime.logger.info(`Running pre handlers: ${pre.map((fn) => fn.name)}, event: ${eventName}`);
  for (const preAction of pre) {
    await preAction();
  }
  // Run main handlers
  runtime.logger.info(`Running main handlers: ${action.map((fn) => fn.name)}, event: ${eventName}`);
  for (const mainAction of action) {
    await mainAction();
  }

  // Run post-handlers
  runtime.logger.info(`Running post handlers: ${post.map((fn) => fn.name)}, event: ${eventName}`);
  for (const postAction of post) {
    await postAction();
  }

  // Skip wildcard handlers for installation event and push event
  if (eventName !== GithubEvent.INSTALLATION_ADDED_EVENT && eventName !== GithubEvent.PUSH_EVENT) {
    // Run wildcard handlers
    runtime.logger.info(`Running wildcard handlers: ${wildcardProcessors.map((fn) => fn.name)}`);
    for (const wildcardProcessor of wildcardProcessors) {
      await wildcardProcessor();
    }
  }
}
