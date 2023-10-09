import { Context } from "probot";
import { createAdapters } from "../adapters";
import { GitHubLogger } from "../adapters/supabase";
import { processors, wildcardProcessors } from "../handlers/processors";
import { validateConfigChange } from "../handlers/push";
import { shouldSkip, upsertCommentToIssue } from "../helpers";
import { GithubEvent, LogLevel, Payload, PayloadSchema } from "../types";
import { ajv } from "../utils";
import { loadConfig } from "./config";

import Runtime from "./bot-runtime";
import { ErrorDiff } from "../utils/helpers";

const NO_VALIDATION = [GithubEvent.INSTALLATION_ADDED_EVENT, GithubEvent.PUSH_EVENT] as string[];

export async function bindEvents(eventContext: Context) {
  const runtime = Runtime.getState();
  runtime.eventContext = eventContext;
  let botConfigError;
  try {
    runtime.botConfig = await loadConfig(eventContext);
  } catch (err) {
    botConfigError = err;
  }

  const payload = eventContext.payload as Payload;
  const allowedEvents = Object.values(GithubEvent) as string[];
  const eventName = payload.action ? `${eventContext.name}.${payload.action}` : eventContext.name; // some events wont have actions as this grows

  runtime.adapters = createAdapters(runtime.botConfig);
  runtime.logger = new GitHubLogger(
    runtime.adapters.supabase.client,
    // contributors will see logs in console while on development environment
    runtime.botConfig?.log?.logEnvironment ?? "development",
    runtime.botConfig?.log?.level ?? LogLevel.DEBUG,
    runtime.botConfig?.log?.retryLimit ?? 0
    // botConfig.logNotification
  );
  if (!runtime.logger) {
    throw new Error("Failed to create logger");
  }

  if (botConfigError) {
    runtime.logger.error({ message: botConfigError.toString() });
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
      if (validate.errors) runtime.logger.warn(validate.errors);
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
  // Run pre-handlers
  runtime.logger.info(`Running pre handlers: "${pre.map((fn) => fn.name)}" event: ${eventName}`);
  for (const preAction of pre) {
    await preAction();
  }
  // Run main handlers
  runtime.logger.info(`Running main handlers: "${action.map((fn) => fn.name)}" event: ${eventName}`);
  for (const mainAction of action) {
    await mainAction();
  }

  // Run post-handlers
  runtime.logger.info(`Running post handlers: "${post.map((fn) => fn.name)}" event: ${eventName}`);
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

  process.on("uncaughtException", async (event) => {
    console.trace();
    await upsertCommentToIssue(
      eventContext.issue().issue_number ?? eventContext.pullRequest().pull_number,
      ErrorDiff(event.message)
    );
  });
}
