import { Context } from "../../types/context";
import { PushPayload } from "../../types/payload";
import { BASE_RATE_FILE, getCommitChanges, ZERO_SHA } from "./push";
import { updateBaseRate } from "./update-base-rate";

export async function checkModifiedBaseRate(context: Context) {
  const logger = context.logger;

  const payload = context.event.payload as PushPayload;

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    logger.info("Skipping push events. A new branch was created");
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    logger.info("No files were changed in the commits, so no action is required.");
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    // update base rate
    await updateBaseRate(context, BASE_RATE_FILE);
  }
}
