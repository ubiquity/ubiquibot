import { Context as ProbotContext } from "probot";
import Runtime from "../../bindings/bot-runtime";

import { DefinedError } from "ajv";
import { createCommitComment } from "../../helpers/commit";
import { getFileContent } from "../../helpers/file";
import { BotConfig, validateBotConfig } from "../../types/configuration-types";
import { CommitsPayload, PushPayload } from "../../types/payload";
import { parseYaml, transformConfig } from "../../utils/generate-configuration";

export const ZERO_SHA = "0000000000000000000000000000000000000000";
export const BASE_RATE_FILE = ".github/ubiquibot-config.yml";

export function getCommitChanges(commits: CommitsPayload[]) {
  const changes = [] as string[];

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

export async function validateConfigChange(context: ProbotContext) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  const payload = context.payload as PushPayload;

  if (!payload.ref.startsWith("refs/heads/")) {
    logger.info("Skipping push events, not a branch");
    return;
  }

  const changes = getCommitChanges(payload.commits);

  // skip if empty
  if (changes && changes.length === 0) {
    logger.info("Skipping push events as there are no file changes in the latest commit.");
    return;
  }

  // check for modified or added files and check for specified file
  if (changes.includes(BASE_RATE_FILE)) {
    const commitSha = payload.commits
      .filter((commit) => commit.modified.includes(BASE_RATE_FILE) || commit.added.includes(BASE_RATE_FILE))
      .reverse()[0]?.id;
    if (!commitSha) {
      logger.info("Skipping push events, commit SHA not found");
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
      const config = parseYaml(decodedConfig);
      const isValid = validateBotConfig(config);
      let errorMsg: string | undefined;

      if (!isValid) {
        const errMsg = generateValidationError(validateBotConfig.errors as DefinedError[]);
        errorMsg = `@${payload.sender.login} ${errMsg}`;
      }

      try {
        transformConfig(config as BotConfig);
      } catch (err) {
        if (errorMsg) {
          errorMsg += `\nConfig transformation failed:\n${err}`;
        } else {
          errorMsg = `@${payload.sender.login} Config transformation failed:\n${err}`;
        }
      }

      if (errorMsg) {
        logger.info("Config validation failed!", errorMsg);
        await createCommitComment(context, errorMsg, commitSha, BASE_RATE_FILE);
      } else {
        logger.info(`Config validation passed!`);
      }
    }
  } else {
    logger.info(`Skipping push events, file change doesn't include config file.`, changes);
  }
}

function generateValidationError(errors: DefinedError[]) {
  const errorsWithoutStrict = errors.filter((error) => error.keyword !== "additionalProperties");
  const errorsOnlyStrict = errors.filter((error) => error.keyword === "additionalProperties");
  const isValid = errorsWithoutStrict.length === 0;
  const errorMsg = isValid
    ? ""
    : errorsWithoutStrict.map((error) => error.instancePath.replaceAll("/", ".") + " " + error.message).join("\n");
  const warningMsg =
    errorsOnlyStrict.length > 0
      ? "Warning! Unnecessary properties: \n" +
        errorsOnlyStrict
          .map(
            (error) =>
              error.keyword === "additionalProperties" &&
              error.instancePath.replaceAll("/", ".") + "." + error.params.additionalProperty
          )
          .join("\n")
      : "";
  return `${isValid ? "Valid" : "Invalid"} configuration. \n${errorMsg}\n${warningMsg}`;
}
