import Runtime from "../../bindings/bot-runtime";
import { PushPayload, Context } from "../../types";
import { updateBaseRate } from "./update-base-rate";
import { ZERO_SHA, getCommitChanges, BASE_RATE_FILE } from "./index";

export async function checkModifiedBaseRate(context: Context) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const payload = context.event.payload as PushPayload;

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    logger.debug("Skipping push events, not a master write");
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    logger.debug("Skipping push events, file change empty 1");
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    // update base rate
    await updateBaseRate(context, BASE_RATE_FILE);
  }
  logger.debug("Skipping push events, file change empty 2");
}
