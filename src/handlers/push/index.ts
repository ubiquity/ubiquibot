import Runtime from "../../bindings/bot-runtime";
import { createCommitComment, getFileContent } from "../../helpers";
import { CommitsPayload, PushPayload, ConfigSchema } from "../../types";
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

export async function runOnPush() {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const context = runtime.eventContext;
  const payload = context.payload as PushPayload;

  // if zero sha, push is a pr change
  if (payload.before === ZERO_SHA) {
    return logger.debug("Skipping push events, not a master write");
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    return logger.debug("Skipping push events, file change empty");
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    // update base rate
    await updateBaseRate(context, payload, BASE_RATE_FILE);
  }
  return logger.debug("Skipping push events, file change empty");
}

export async function validateConfigChange() {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const context = runtime.eventContext;
  const payload = context.payload as PushPayload;

  if (!payload.ref.startsWith("refs/heads/")) {
    return logger.debug("Skipping push events, not a branch");
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    return logger.debug("Skipping push events, file change empty");
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    const commitSha = payload.commits
      .filter((commit) => commit.modified.includes(BASE_RATE_FILE) || commit.added.includes(BASE_RATE_FILE))
      .reverse()[0]?.id;
    if (!commitSha) {
      return logger.debug("Skipping push events, commit sha not found");
    }

    const configFileContent = await getFileContent(
      payload.repository.owner.login,
      payload.repository.name,
      payload.ref.split("refs/heads/")[1],
      BASE_RATE_FILE,
      commitSha
    );

    if (configFileContent) {
      const decodedConfig = Buffer.from(configFileContent, "base64").toString();
      const config = parseYAML(decodedConfig);
      const { valid, error } = validate(ConfigSchema, config);
      if (!valid) {
        await createCommitComment(
          `@${payload.sender.login} Config validation failed! ${error}`,
          commitSha,
          BASE_RATE_FILE
        );
      }
    }
  }
  return logger.debug("Skipping push events, file change empty");
}
