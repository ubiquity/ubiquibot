import { Context } from "probot";
import { createAdapters } from "../adapters";
import { LogReturn } from "../adapters/supabase";
import { processors, wildcardProcessors } from "../handlers/processors";
import { validateConfigChange } from "../handlers/push";
import { addCommentToIssue, shouldSkip } from "../helpers";
import {
  ActionHandler,
  GithubEvent,
  Payload,
  PayloadSchema,
  PostActionHandler,
  PreActionHandler,
  WildCardHandler,
} from "../types";
import { ajv } from "../utils";

import Runtime from "./bot-runtime";
import { loadConfig } from "./config";

const NO_VALIDATION = [GithubEvent.INSTALLATION_ADDED_EVENT, GithubEvent.PUSH_EVENT] as string[];

type PreHandlerWithType = { type: string; actions: PreActionHandler[] };
type HandlerWithType = { type: string; actions: ActionHandler[] };
type WildCardHandlerWithType = { type: string; actions: WildCardHandler[] };

type PostHandlerWithType = { type: string; actions: PostActionHandler[] };

type AllHandlersWithTypes = PreHandlerWithType | HandlerWithType | PostHandlerWithType;

type AllHandlers = PreActionHandler | ActionHandler | PostActionHandler;

export async function bindEvents(eventContext: Context) {
  const runtime = Runtime.getState();
  runtime.eventContext = eventContext;
  runtime.botConfig = await loadConfig(eventContext);

  runtime.adapters = createAdapters(runtime.botConfig);
  runtime.logger = runtime.adapters.supabase.logs;

  if (!runtime.botConfig.payout.privateKey) {
    runtime.logger.warn("No EVM private key found");
  }

  const payload = eventContext.payload as Payload;
  const allowedEvents = Object.values(GithubEvent) as string[];
  const eventName = payload.action ? `${eventContext.name}.${payload.action}` : eventContext.name; // some events wont have actions as this grows
  if (eventName === GithubEvent.PUSH_EVENT) {
    await validateConfigChange();
  }

  if (!runtime.logger) {
    throw new Error("Failed to create logger");
  }

  runtime.logger.info("Binding events", { id: eventContext.id, name: eventName, allowedEvents });

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
      return runtime.logger.info("Skipping the event. reason:", should.reason);
    }
  }

  // Get the handlers for the action
  const handlers = processors[eventName];
  if (!handlers) {
    return runtime.logger.warn("No handler configured for event:", eventName);
  }
  const { pre, action, post } = handlers;

  const handlerTypes: AllHandlersWithTypes[] = [
    { type: "pre", actions: pre },
    { type: "main", actions: action },
    { type: "post", actions: post },
  ];

  for (const handlerType of handlerTypes) {
    // List all the function names of handlerType.actions
    const functionNames = handlerType.actions.map((action) => action?.name);

    runtime.logger.info(
      `Running "${handlerType.type}" for event: "${eventName}". handlers: "${functionNames.join(", ")}"`
    );
    await logAnyReturnFromHandlers(handlerType);
  }

  // Skip wildcard handlers for installation event and push event
  if (eventName == GithubEvent.INSTALLATION_ADDED_EVENT || eventName == GithubEvent.PUSH_EVENT) {
    return runtime.logger.info("Skipping wildcard handlers for event:", eventName);
  } else {
    // Run wildcard handlers
    const functionNames = wildcardProcessors.map((action: any) => action.name);
    runtime.logger.info("Running wildcard handlers:", functionNames.join(", "));
    const wildCardHandlerType: WildCardHandlerWithType = { type: "wildcard", actions: wildcardProcessors };
    await logAnyReturnFromHandlers(wildCardHandlerType);
  }
}

async function logAnyReturnFromHandlers(handlerType: AllHandlersWithTypes) {
  for (const action of handlerType.actions) {
    const loggerHandler = createLoggerHandler(handlerType, action);
    try {
      const response = await action();
      if (handlerType.type === "action") {
        // only log action handler results
        logMultipleDataTypes(response, action);
        // if (handlerType.type !== "pre" && handlerType.type !== "post" && handlerType.type !== "wildcard") {
      } else {
        const runtime = Runtime.getState();
        runtime.logger.ok("Completed", { action: action.name, type: handlerType.type });
      }
    } catch (report: any) {
      await loggerHandler(report);
    }
  }
}

function logMultipleDataTypes(response: string | void | LogReturn, action: AllHandlers) {
  const runtime = Runtime.getState();
  if (response instanceof LogReturn) {
    runtime.logger.debug(response.logMessage.raw, response.metadata, true);
  } else if (typeof response == "string") {
    runtime.logger.debug(response, null, true);
  } else {
    runtime.logger.error(
      `No response from "${action.name}" action. Ensure return of string or LogReturn object`,
      null,
      true
    );
  }
}

function createLoggerHandler(handlerType: AllHandlersWithTypes, activeHandler: AllHandlers) {
  const runtime = Runtime.getState();

  return async function loggerHandler(logReturn: LogReturn | Error | unknown) {
    const issue = (runtime.eventContext.payload as Payload).issue;
    if (!issue) return runtime.logger.error("Issue is null. Skipping", { issue });

    if (logReturn instanceof LogReturn) {
      // already made it to console so it should just post the comment
      const { logMessage } = logReturn;

      if (logReturn.metadata) {
        const serializedMetadata = JSON.stringify(logReturn.metadata, null, 2);
        const metadataForComment = ["```json", serializedMetadata, "```"].join("\n");
        return await addCommentToIssue([logMessage.diff, metadataForComment].join("\n"), issue.number);
      } else {
        return await addCommentToIssue(logMessage.diff, issue.number);
      }
    }

    const outputComment =
      logReturn instanceof Error
        ? `${handlerType.type} action "${activeHandler.name}" has an uncaught error`
        : `${handlerType.type} action "${activeHandler.name}" returned an unexpected value`;

    //   // Log the instance of _report
    //   console.trace(`_report is an instance of: ${_report.constructor.name}`);
    // await addCommentToIssue(outputComment, issue.number);
    return runtime.logger.error(outputComment, logReturn, true);
  };
}
