import { getLogger } from "../../bindings";
import { createCommitComment, getFileContent } from "../../helpers";
import { BotContext, CommitsPayload, PushPayload, WideConfigSchema } from "../../types";
import { parseYAML } from "../../utils/private";
import { updateBaseRate } from "./update-base";
import { validate } from "../../utils/ajv";

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

export const runOnPush = async (context: BotContext) => {
  const logger = getLogger();
  const payload = context.payload as PushPayload;

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    logger.debug("Skipping push events, not a master write");
    return;
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    logger.debug("Skipping push events, file change empty");
    return;
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    // update base rate
    await updateBaseRate(context, payload, BASE_RATE_FILE);
  }
};

export const validateConfigChange = async (context: BotContext) => {
  const logger = getLogger();
  const payload = context.payload as PushPayload;

  if (!payload.ref.startsWith("refs/heads/")) {
    logger.debug("Skipping push events, not a branch");
    return;
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    logger.debug("Skipping push events, file change empty");
    return;
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    const commitSha = payload.commits.filter((commit) => commit.modified.includes(BASE_RATE_FILE) || commit.added.includes(BASE_RATE_FILE)).reverse()[0]?.id;
    if (!commitSha) {
      logger.debug("Skipping push events, commit sha not found");
      return;
    }

    const configFileContent = await getFileContent(
      context,
      payload.repository.owner.login,
      payload.repository.name,
      payload.ref.split("refs/heads/")[1],
      BASE_RATE_FILE,
      commitSha
    );

    if (configFileContent) {
      const decodedConfig = Buffer.from(configFileContent, "base64").toString();
      const config = parseYAML(decodedConfig);
      const { valid, error } = validate(WideConfigSchema, config);
      if (!valid) {
        await createCommitComment(context, `@${payload.sender.login} Config validation failed! ${error}`, commitSha, BASE_RATE_FILE);
      }
    }
  }
};
