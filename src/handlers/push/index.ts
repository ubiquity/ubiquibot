import { getBotContext, getLogger } from "../../bindings";
import { getFileContent } from "../../helpers";
import { CommitsPayload, PushPayload } from "../../types";
import { ajv } from "../../utils";
import { parseYAML } from "../../utils/private";
import { updateBaseRate } from "./update-base";
import { WideOrgConfigSchema } from "../../utils/private";

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

export const validateConfigChange = async () => {
  const logger = getLogger();

  const context = getBotContext();
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
      payload.repository.owner.login,
      payload.repository.name,
      payload.ref.split("refs/heads/")[1],
      BASE_RATE_FILE,
      commitSha
    );

    if (configFileContent) {
      const decodedConfig = Buffer.from(configFileContent, "base64").toString();
      const config = parseYAML(decodedConfig);
      const valid = ajv.validate(WideOrgConfigSchema, config); // additionalProperties: false is required to prevent unknown properties from being allowed
      if (!valid) {
        // post commit comment
        const additionalProperties = ajv.errors?.map((error) => {
          if (error.keyword === "additionalProperties") {
            return error.params.additionalProperty;
          }
        });
        await context.octokit.rest.repos.createCommitComment({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          commit_sha: commitSha,
          body: `@${payload.sender.login} Config validation failed! Error: ${ajv.errorsText()}. ${
            additionalProperties && additionalProperties.length > 0 ? `Unnecessary properties: ${additionalProperties.join(", ")}` : ""
          }`,
          path: BASE_RATE_FILE,
        });
      }
    }
  }
};
