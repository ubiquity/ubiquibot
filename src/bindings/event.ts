import OpenAI from "openai";
import { Context as ProbotContext } from "probot";
import { createAdapters, supabaseClient } from "../adapters";
import { LogReturn } from "../adapters/supabase";
import { LogMessage, Logs } from "../adapters/supabase/helpers/tables/logs";
import { processors, wildcardProcessors } from "../handlers/processors";
import { validateConfigChange } from "../handlers/push";
import structuredMetadata from "../handlers/shared/structured-metadata";
import { addCommentToIssue, shouldSkip } from "../helpers";
import { BotConfig } from "../types/configuration-types";

import { Context } from "../types/context";
import {
  HandlerReturnValuesNoVoid,
  MainActionHandler,
  PostActionHandler,
  PreActionHandler,
  WildCardHandler,
} from "../types/handlers";
import { GitHubEvent, Payload, payloadSchema } from "../types/payload";
import { ajv } from "../utils/ajv";
import { generateConfiguration } from "../utils/generate-configuration";
import Runtime from "./bot-runtime";
import { env } from "./env";

const allowedEvents = Object.values(GitHubEvent) as string[];

const NO_VALIDATION = [GitHubEvent.INSTALLATION_ADDED_EVENT, GitHubEvent.PUSH_EVENT] as string[];
type PreHandlerWithType = { type: string; actions: PreActionHandler[] };
type HandlerWithType = { type: string; actions: MainActionHandler[] };
type WildCardHandlerWithType = { type: string; actions: WildCardHandler[] };
type PostHandlerWithType = { type: string; actions: PostActionHandler[] };
type AllHandlersWithTypes = PreHandlerWithType | HandlerWithType | PostHandlerWithType;
type AllHandlers = PreActionHandler | MainActionHandler | PostActionHandler;

const validatePayload = ajv.compile(payloadSchema);

const runtime = Runtime.getState();
runtime.adapters = createAdapters();
runtime.logger = runtime.adapters.supabase.logs;

export async function bindEvents(eventContext: ProbotContext) {
  const payload = eventContext.payload as Payload;
  const eventName = payload?.action ? `${eventContext.name}.${payload?.action}` : eventContext.name; // some events wont have actions as this grows
  const logger = new Logs(supabaseClient, env.LOG_ENVIRONMENT, env.LOG_RETRY_LIMIT, env.LOG_LEVEL, eventContext);

  logger.info("Event received", { id: eventContext.id, name: eventName });

  if (!allowedEvents.includes(eventName)) {
    // just check if its on the watch list
    return logger.info(`Skipping the event. reason: not configured`);
  }

  // Skip validation for installation event and push
  if (!NO_VALIDATION.includes(eventName)) {
    // Validate payload
    const isValid = validatePayload(payload);
    if (!isValid && validatePayload.errors) {
      return logger.error("Payload schema validation failed!", validatePayload.errors);
    }

    // Check if we should skip the event
    const should = shouldSkip(eventContext);
    if (should.stop) {
      return logger.info("Skipping the event.", { reason: should.reason });
    }
  }

  if (eventName === GitHubEvent.PUSH_EVENT) {
    await validateConfigChange(eventContext);
  }

  let botConfig: BotConfig;
  try {
    botConfig = await generateConfiguration(eventContext);
  } catch (error) {
    return;
  }
  const context: Context = {
    event: eventContext,
    config: botConfig,
    openAi: botConfig.keys.openAi ? new OpenAI({ apiKey: botConfig.keys.openAi }) : null,
    logger: logger,
    payload: payload,
    octokit: eventContext.octokit,
  };

  if (!context.config.keys.evmPrivateEncrypted) {
    context.logger.warn("No EVM private key found");
  }

  if (!context.logger) {
    throw new Error("Failed to create logger");
  }

  // Get the handlers for the action
  const handlers = processors[eventName];

  if (!handlers) {
    return context.logger.warn("No handler configured for event:", { eventName });
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

    context.logger.info(
      `Running "${handlerWithType.type}" \
      for event: "${eventName}". \
      handlers: "${functionNames.join(", ")}"`
    );

    await logAnyReturnFromHandlers(context, handlerWithType);
  }

  // Skip wildcard handlers for installation event and push event
  if (eventName == GitHubEvent.INSTALLATION_ADDED_EVENT || eventName == GitHubEvent.PUSH_EVENT) {
    return context.logger.info("Skipping wildcard handlers for event:", eventName);
  } else {
    // Run wildcard handlers
    const functionNames = wildcardProcessors.map((action) => action?.name);
    context.logger.info(`Running wildcard handlers: "${functionNames.join(", ")}"`);
    const wildCardHandlerType: WildCardHandlerWithType = { type: "wildcard", actions: wildcardProcessors };
    await logAnyReturnFromHandlers(context, wildCardHandlerType);
  }
}

async function logAnyReturnFromHandlers(context: Context, handlerType: AllHandlersWithTypes) {
  for (const action of handlerType.actions) {
    const renderCatchAllWithContext = createRenderCatchAll(context, handlerType, action);
    try {
      // checkHandler(action);
      const response = await action(context);

      if (handlerType.type === "main") {
        // only log main handler results
        await renderMainActionOutput(context, response, action);
      } else {
        context.logger.ok("Completed", { action: action.name, type: handlerType.type });
      }
    } catch (report: unknown) {
      await renderCatchAllWithContext(report);
    }
  }
}

async function renderMainActionOutput(
  context: Context,
  response: void | HandlerReturnValuesNoVoid,
  action: AllHandlers
) {
  const { payload, logger } = context;
  const issueNumber = payload.issue?.number;
  if (!issueNumber) {
    throw new Error("No issue number found");
  }

  if (response instanceof LogReturn) {
    let serializedComment;
    if (response.metadata) {
      serializedComment = [
        response.logMessage.diff,
        structuredMetadata.create(response.logMessage.type, response.metadata),
      ].join("\n");
    } else {
      serializedComment = response.logMessage.diff;
    }

    await addCommentToIssue(context, serializedComment, issueNumber);
  } else if (typeof response == "string") {
    await addCommentToIssue(context, response, issueNumber);
  } else if (response === null) {
    logger.debug("null response", { action: action.name });
  } else {
    logger.error(
      "No response from action. Ensure return of string, null, or LogReturn object",
      { action: action.name },
      true
    );
  }
}

function createRenderCatchAll(context: Context, handlerType: AllHandlersWithTypes, activeHandler: AllHandlers) {
  return async function renderCatchAll(report: LogReturn | Error | unknown) {
    const payload = context.event.payload as Payload;
    const issue = payload.issue;
    if (!issue) {
      return context.logger.error("Issue is null. Skipping", { issue });
    }

    if (report instanceof LogReturn) {
      // already made it to console so it should just post the comment
      const { logMessage } = report;

      if (report.metadata) {
        context.logger.debug("this is the second place that metadata is being serialized as an html comment");
        let metadataSerialized;
        const prettySerialized = JSON.stringify(report.metadata, null, 2);
        // first check if metadata is an error, then post it as a json comment
        // otherwise post it as an html comment
        if (report.logMessage.type === ("error" as LogMessage["type"])) {
          metadataSerialized = ["```json", prettySerialized, "```"].join("\n");
        } else {
          metadataSerialized = ["<!--", prettySerialized, "-->"].join("\n");
        }

        return await addCommentToIssue(context, [logMessage.diff, metadataSerialized].join("\n"), issue.number);
      } else {
        return await addCommentToIssue(context, logMessage.diff, issue.number);
      }
    } else if (report instanceof Error) {
      // convert error to normal object
      const error = {
        name: report.name,
        message: report.message,
        stack: report.stack,
      };

      return context.logger.error(
        "action has an uncaught error",
        { logReturn: report, handlerType, activeHandler: activeHandler.name, error },
        true
      );
    } else {
      // could be supabase error
      // interface SupabaseError {
      //   code: "PGRST116";
      //   details: "The result contains 0 rows";
      //   hint: null;
      //   message: "JSON object requested, multiple (or no) rows returned";
      // }

      // report as SupabaseError

      return context.logger.error(
        "action returned an unexpected value",
        { logReturn: report, handlerType, activeHandler: activeHandler.name },
        true
      );
    }
  };
}
