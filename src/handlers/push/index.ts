import { getBotContext, getLogger } from "../../bindings";
import { PushPayload } from "../../types";
import { updateBaseRate } from "./update-base";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const BASE_RATE_FILE = ".github/ubiquibot-config.yml";

export const runOnPush = async () => {
  const logger = getLogger();

  const context = getBotContext();
  const payload = context.payload as PushPayload;

  updateBaseRate();

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    logger.debug("Skipping push events, not a master write");
    return;
  }

  // check for modified or added files and check for specified file
  if (BASE_RATE_FILE) {
  }
};
