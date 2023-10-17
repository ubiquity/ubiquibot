import { Context } from "probot";
import { createAdapters } from "../adapters";
import { LogReturn } from "../adapters/supabase";
import { LogMessage } from "../adapters/supabase/helpers/tables/logs";
import { processors, wildcardProcessors } from "../handlers/processors";
import { validateConfigChange } from "../handlers/push";
import { addCommentToIssue, shouldSkip } from "../helpers";
import {
  GitHubEvent,
  MainActionHandler,
  PayloadSchema,
  PostActionHandler,
  PreActionHandler,
  WildCardHandler,
} from "../types";
import { Payload } from "../types/payload";
import { ajv } from "../utils";
import Runtime from "./bot-runtime";
import { loadConfig } from "./config";
const NO_VALIDATION = [GitHubEvent.INSTALLATION_ADDED_EVENT, GitHubEvent.PUSH_EVENT] as string[];
type PreHandlerWithType = { type: string; actions: PreActionHandler[] };
type HandlerWithType = { type: string; actions: MainActionHandler[] };
type WildCardHandlerWithType = { type: string; actions: WildCardHandler[] };
type PostHandlerWithType = { type: string; actions: PostActionHandler[] };
type AllHandlersWithTypes = PreHandlerWithType | HandlerWithType | PostHandlerWithType;
type AllHandlers = PreActionHandler | MainActionHandler | PostActionHandler;
export async function bindEvents(eventContext: Context) {
  const runtime = Runtime.getState();
  runtime.latestEventContext = eventContext;
  runtime.botConfig = await loadConfig(eventContext);

  runtime.adapters = createAdapters(runtime.botConfig);
  runtime.logger = runtime.adapters.supabase.logs;

  if (!runtime.botConfig.payout.privateKey) {
    runtime.logger.warn("No EVM private key found");
  }

  const payload = eventContext.payload as Payload;
  const allowedEvents = Object.values(GitHubEvent) as string[];
  const eventName = payload?.action ? `${eventContext.name}.${payload?.action}` : eventContext.name; // some events wont have actions as this grows
  if (eventName === GitHubEvent.PUSH_EVENT) {
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
      return runtime.logger.info("Skipping the event.", { reason: should.reason });
    }
  }

  // Get the handlers for the action
  const handlers = processors[eventName];

  if (!handlers) {
    return runtime.logger.warn("No handler configured for event:", { eventName });
  }
  const { pre, action, post } = handlers;

  const handlerWithTypes: AllHandlersWithTypes[] = [
    { type: "pre", actions: pre },
    { type: "main", actions: action },
    { type: "post", actions: post },
  ];

  for (const handlerWithType of handlerWithTypes) {
    // List all the function names of handlerType.actions
    const functionNames = handlerWithType.actions.map((action) => action?.name);

    runtime.logger.info(
      `Running "${handlerWithType.type}" \
      for event: "${eventName}". \
      handlers: "${functionNames.join(", ")}"`
    );

    await logAnyReturnFromHandlers(handlerWithType);
  }

  // Skip wildcard handlers for installation event and push event
  if (eventName == GitHubEvent.INSTALLATION_ADDED_EVENT || eventName == GitHubEvent.PUSH_EVENT) {
    return runtime.logger.info("Skipping wildcard handlers for event:", eventName);
  } else {
    // Run wildcard handlers
    const functionNames = wildcardProcessors.map((action) => action?.name);
    runtime.logger.info(`Running wildcard handlers: "${functionNames.join(", ")}"`);
    const wildCardHandlerType: WildCardHandlerWithType = { type: "wildcard", actions: wildcardProcessors };
    await logAnyReturnFromHandlers(wildCardHandlerType);
  }
}

async function logAnyReturnFromHandlers(handlerType: AllHandlersWithTypes) {
  for (const action of handlerType.actions) {
    const renderCatchAllWithContext = createRenderCatchAll(handlerType, action);
    try {
      // checkHandler(action);
      const response = await action();

      if (handlerType.type === "main") {
        // only log main handler results
        await renderMainActionOutput(response, action);
      } else {
        const runtime = Runtime.getState();
        runtime.logger.ok("Completed", { action: action.name, type: handlerType.type });
      }
    } catch (report: unknown) {
      await renderCatchAllWithContext(report);
    }
  }
}

async function renderMainActionOutput(response: string | void | LogReturn, action: AllHandlers) {
  const runtime = Runtime.getState();
  const payload = runtime.latestEventContext.payload as Payload;
  const issueNumber = payload.issue?.number;
  if (!issueNumber) {
    throw new Error("No issue number found");
  }

  if (response instanceof LogReturn) {
    // console.trace({ response });
    let serializedComment;
    if (response.metadata) {
      serializedComment = [response.logMessage.diff, "<!--", JSON.stringify(response.metadata, null, 2), "-->"].join(
        "\n"
      );
    } else {
      serializedComment = response.logMessage.diff;
    }

    await addCommentToIssue(serializedComment, issueNumber);
    // runtime.logger[response.logMessage.type as LogMessage["type"]](response.logMessage.raw, response.metadata, true);
  } else if (typeof response == "string") {
    await addCommentToIssue(response, issueNumber);
    // runtime.logger.debug(response, null, true);
  } else {
    runtime.logger.error(
      "No response from action. Ensure return of string or LogReturn object",
      { action: action.name },
      true
    );
  }
}

function createRenderCatchAll(handlerType: AllHandlersWithTypes, activeHandler: AllHandlers) {
  return async function renderCatchAll(logReturn: LogReturn | Error | unknown) {
    const runtime = Runtime.getState();
    const payload = runtime.latestEventContext.payload as Payload;
    const issue = payload.issue;
    if (!issue) return runtime.logger.error("Issue is null. Skipping", { issue });

    if (logReturn instanceof LogReturn) {
      // already made it to console so it should just post the comment
      const { logMessage } = logReturn;

      if (logReturn.metadata) {
        console.trace("this is the second place that metadata is being serialized as an html comment");
        let metadataSerialized;
        const prettySerialized = JSON.stringify(logReturn.metadata, null, 2);
        // first check if metadata is an error, then post it as a json comment
        // otherwise post it as an html comment
        if (logReturn.logMessage.type === ("error" as LogMessage["type"])) {
          metadataSerialized = ["```json", prettySerialized, "```"].join("\n");
        } else {
          metadataSerialized = ["<!--", prettySerialized, "-->"].join("\n");
        }

        return await addCommentToIssue([logMessage.diff, metadataSerialized].join("\n"), issue.number);
      } else {
        return await addCommentToIssue(logMessage.diff, issue.number);
      }
    } else if (logReturn instanceof Error) {
      return runtime.logger.error(
        "action has an uncaught error",
        { logReturn, handlerType, activeHandler: activeHandler.name },
        true
      );
    } else {
      return runtime.logger.error(
        "action returned an unexpected value",
        { logReturn, handlerType, activeHandler: activeHandler.name },
        true
      );
    }
  };
}
