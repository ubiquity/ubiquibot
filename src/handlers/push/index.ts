import { getBotContext, getLogger } from "../../bindings";
import { PushPayload } from "../../types";
import { updateBaseRate } from "./update-base";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const BASE_RATE_FILE = ".github/ubiquibot-config.yml";

export const runOnPush = async () => {
  const logger = getLogger();

  const context = getBotContext();
  const payload = context.payload as PushPayload;

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    logger.debug("Skipping push events, not a master write");
    return;
  }

  // skip if empty
  if (payload.head_commit && payload.head_commit.modified.length === 0 && payload.head_commit.added.length === 0) {
    logger.debug("Skipping push events, file change empty");
    return;
  }

  // check for modified or added files and check for specified file
  if (payload.head_commit.modified.includes(BASE_RATE_FILE) || payload.head_commit.added.includes(BASE_RATE_FILE)) {
    // update base rate
    await updateBaseRate(context, payload, BASE_RATE_FILE);
  }
};
