import { getBotContext, getLogger } from "../../bindings";
import { CommitsPayload, PushPayload } from "../../types";
import { updateBaseRate } from "./update-base";

const ZERO_SHA = "0000000000000000000000000000000000000000";
const BASE_RATE_FILE = ".github/ubiquibot-config.yml";

function getCommitChanges(commits: CommitsPayload[]) {
  const changes = [];

  for (const commit of commits) {
    for (const modifiedFile of commit.modified) {
      changes.push(modifiedFile);
    }
    for (const addedFile of commit.added) {
      changes.push(addedFile);
    }
  }
  return changes;
}

export const runOnPush = async () => {
  const logger = getLogger();

  const context = getBotContext();
  const payload = context.payload as PushPayload;

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    logger.debug("Disabled push events, not a master write");
    return;
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    logger.debug("Disabled push events, file change empty");
    return;
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    // update base rate
    await updateBaseRate(context, payload, BASE_RATE_FILE);
  }
};
