import { Context } from "probot";
import { createAdapters } from "../adapters";
import { LogReturn } from "../adapters/supabase";
import { processors, wildcardProcessors } from "../handlers/processors";
import { validateConfigChange } from "../handlers/push";
import { shouldSkip } from "../helpers";
import { ActionHandler, GithubEvent, Payload, PayloadSchema } from "../types";
import { ajv } from "../utils";

import Runtime from "./bot-runtime";
import { loadConfig } from "./config";

const NO_VALIDATION = [GithubEvent.INSTALLATION_ADDED_EVENT, GithubEvent.PUSH_EVENT] as string[];

type HandlerType = { type: string; actions: ActionHandler[] };

export async function bindEvents(eventContext: Context) {
  const runtime = Runtime.getState();
  runtime.eventContext = eventContext;

  if (!runtime.logger) {
    throw new Error("Failed to create logger");
  }

  let botConfigError;
  try {
    runtime.botConfig = await loadConfig(eventContext);
    console.trace(runtime.botConfig.payout.privateKey);
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
  const handlerTypes: HandlerType[] = [
    { type: "pre", actions: pre },
    { type: "main", actions: action },
    { type: "post", actions: post },
  ];

  for (const handlerType of handlerTypes) {
    runtime.logger.info(`Running "${handlerType.type}" for event: "${eventName}". handlers:`, handlerType.actions);
    await logAnyReturnFromHandlers(handlerType);
  }

  // Skip wildcard handlers for installation event and push event
  if (eventName == GithubEvent.INSTALLATION_ADDED_EVENT || eventName == GithubEvent.PUSH_EVENT) {
    return runtime.logger.info(`Skipping wildcard handlers for event: ${eventName}`);
  } else {
    // Run wildcard handlers
    runtime.logger.info(`Running wildcard handlers: ${wildcardProcessors.map((fn) => fn.name)}`);
    const handlerType: HandlerType = { type: "wildcard", actions: wildcardProcessors };
    await logAnyReturnFromHandlers(handlerType);
  }
}

async function logAnyReturnFromHandlers(handlerType: HandlerType) {
  for (const action of handlerType.actions) {
    const loggerHandler = createLoggerHandler(handlerType, action);
    try {
      const response = await action();
      logMultipleDataTypes(response);
    } catch (report: any) {
      await loggerHandler(report);
    }
  }
}

function logMultipleDataTypes(response: string | void | LogReturn) {
  const runtime = Runtime.getState();
  if (response instanceof LogReturn) {
    runtime.logger.ok(response.logMessage.raw, response.metadata, true);
  } else if (typeof response == "string") {
    runtime.logger.ok(response, null, true);
  } else {
    runtime.logger.error("No response from action. Ensure return of string or LogReturn object", null, true);
  }
}

function createLoggerHandler(handlerType: HandlerType, activeHandler: ActionHandler) {
  const runtime = Runtime.getState();
  return async function loggerHandler(report: any) {
    if (report instanceof LogReturn) {
      // recognized return type
      const outputComment = report?.logMessage?.raw;
      const type = report?.logMessage?.type as keyof typeof runtime.logger;
      delete report?.logMessage;
      // check if report.metadata is empty
      const isEmpty = Object.values(report).every((value) => value === undefined);
      const selectedLogger = runtime.logger[type] as typeof runtime.logger.info;
      selectedLogger.bind(runtime.logger); // used for `this` context
      if (!selectedLogger) {
        runtime.logger.error.bind(runtime.logger); // used for `this` context
        runtime.logger.error(`Logger type "${type}" not found`);
        // console.trace(report);
        return report;
      }
      if (isEmpty) {
        return selectedLogger(outputComment, null, true);
      } else {
        return selectedLogger(outputComment, report, true);
      }
    } else if (report instanceof Error) {
      // unrecognized return type

      const outputComment = `${handlerType.type} action "${activeHandler.name}" has an uncaught error`; // it has a default message
      runtime.logger.error.bind(runtime.logger); // used for `this` context
      return runtime.logger.error(outputComment, report, true);
    } else {
      // unrecognized return type TODO: add instanceof Error class as well
      const outputComment = `${handlerType.type} action "${activeHandler.name}" returned an unexpected value`;
      runtime.logger.error.bind(runtime.logger); // used for `this` context
      return runtime.logger.error(outputComment, report, true);
    }
  };
}
