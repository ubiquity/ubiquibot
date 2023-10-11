import { Context } from "probot";
import { createAdapters } from "../adapters";
import { processors, wildcardProcessors } from "../handlers/processors";
import { validateConfigChange } from "../handlers/push";
import { shouldSkip } from "../helpers";
import { GithubEvent, Payload, PayloadSchema } from "../types";
import { ajv } from "../utils";
import { loadConfig } from "./config";

import Runtime from "./bot-runtime";

const NO_VALIDATION = [GithubEvent.INSTALLATION_ADDED_EVENT, GithubEvent.PUSH_EVENT] as string[];

export async function bindEvents(eventContext: Context) {
  const runtime = Runtime.getState();
  runtime.eventContext = eventContext;

  if (!runtime.logger) {
    throw new Error("Failed to create logger");
  }

  let botConfigError;
  try {
    runtime.botConfig = await loadConfig(eventContext);
  } catch (err) {
    botConfigError = err;
  }

  runtime.adapters = createAdapters(runtime.botConfig);
  runtime.logger = runtime.adapters.supabase.logs;

  const payload = eventContext.payload as Payload;
  const allowedEvents = Object.values(GithubEvent) as string[];
  const eventName = payload.action ? `${eventContext.name}.${payload.action}` : eventContext.name; // some events wont have actions as this grows

  if (!runtime.logger) {
    throw new Error("Failed to create logger");
  }

  if (botConfigError) {
    runtime.logger.error("Bot configuration error", botConfigError);
    if (eventName === GithubEvent.PUSH_EVENT) {
      await validateConfigChange();
    }
    throw new Error("Failed to load config");
  }

  runtime.logger.info(`Binding events... id: ${eventContext.id}, name: ${eventName}, allowedEvents: ${allowedEvents}`);

  if (!allowedEvents.includes(eventName)) {
    // just check if its on the watch list
    return runtime.logger.info(`Skipping the event. reason: not configured`);
  }

  // Skip validation for installation event and push
  if (!NO_VALIDATION.includes(eventName)) {
    // Validate payload
    const validate = ajv.compile(PayloadSchema);
    const valid = validate(payload);
    if (!valid) {
      runtime.logger.info("Payload schema validation failed!", payload);
      if (validate.errors) {
        runtime.logger.warn("validation errors", validate.errors);
      }
      return;
    }

    // Check if we should skip the event
    const should = shouldSkip();
    if (should.stop) {
      return runtime.logger.info(`Skipping the event because ${should.reason}`);
    }
  }

  // Get the handlers for the action
  const handlers = processors[eventName];
  if (!handlers) {
    return runtime.logger.warn(`No handler configured for event: ${eventName}`);
  }

  const { pre, action, post } = handlers;
  const handlerTypes = [
    { type: "pre", actions: pre },
    { type: "main", actions: action },
    { type: "post", actions: post },
  ];

  for (const handlerType of handlerTypes) {
    runtime.logger.info(
      `Running ${handlerType.type} handlers: "${handlerType.actions.map((fn) => fn.name)}" event: ${eventName}`
    );
    for (const action of handlerType.actions) {
      try {
        const response = await action();
        if (response) {
          runtime.logger.ok(response, null, true);
        }
      } catch (error: unknown) {
        const errorMetaData = {
          action: action.name,
          error: error,
        };

        // TODO: associate location metadata to `location` table
        runtime.logger.error(`${handlerType.type} action uncaught error`, errorMetaData, true); // FIXME:
      }
    }
  }
  // Skip wildcard handlers for installation event and push event
  if (eventName !== GithubEvent.INSTALLATION_ADDED_EVENT && eventName !== GithubEvent.PUSH_EVENT) {
    // Run wildcard handlers
    runtime.logger.info(`Running wildcard handlers: ${wildcardProcessors.map((fn) => fn.name)}`);
    for (const wildcardProcessor of wildcardProcessors) {
      try {
        const response = await wildcardProcessor();
        if (response) {
          runtime.logger.ok(response, null, true);
        }
      } catch (error: unknown) {
        // TODO: associate location metadata to `location` table
        runtime.logger.error(
          `wildcard action uncaught error`,
          {
            action: wildcardProcessor.name,
            error,
          },
          true
        );
      }
    }
  }
}
