import Runtime from "../../bindings/bot-runtime";
import { PushPayload } from "../../types";
import { updateBaseRate } from "./update-base-rate";
import { ZERO_SHA, getCommitChanges, BASE_RATE_FILE } from "./index";

export async function checkModifiedBaseRate() {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const context = runtime.eventContext;
  const payload = context.payload as PushPayload;

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    logger.debug("Skipping push events, not a master write");
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    logger.debug("Skipping push events, file change empty");
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    // update base rate
    await updateBaseRate(context, payload, BASE_RATE_FILE);
  }
  logger.debug("Skipping push events, file change empty");
}
