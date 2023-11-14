import { Value } from "@sinclair/typebox/value";
import { DefinedError } from "ajv";
import merge from "lodash/merge";
import { Context as ProbotContext } from "probot";
import YAML from "yaml";
import Runtime from "../bindings/bot-runtime";
import { BotConfig, Payload, stringDuration, validateBotConfig } from "../types";
import ubiquibotConfigDefault from "../ubiquibot-config-default";

const UBIQUIBOT_CONFIG_REPOSITORY = "ubiquibot-config";
const UBIQUIBOT_CONFIG_FULL_PATH = ".github/ubiquibot-config.yml";

export async function generateConfiguration(context: ProbotContext): Promise<BotConfig> {
  const payload = context.payload as Payload;

  const organizationConfiguration = parseYaml(
    await download({
      context,
      repository: UBIQUIBOT_CONFIG_REPOSITORY,
      owner: payload.organization?.login || payload.repository.owner.login,
    })
  );

  const repositoryConfiguration = parseYaml(
    await download({
      context,
      repository: payload.repository.name,
      owner: payload.repository.owner.login,
    })
  );

  let orgConfig: BotConfig | undefined;
  if (organizationConfiguration) {
    const valid = validateBotConfig(organizationConfiguration);
    if (!valid) {
      let errMsg = getErrorMsg(validateBotConfig.errors as DefinedError[]);
      if (errMsg) {
        errMsg = `Invalid org configuration! \n${errMsg}`;
        if (payload.issue?.number)
          await context.octokit.issues.createComment({
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            issue_number: payload.issue?.number,
            body: errMsg,
          });
        throw new Error(errMsg);
      }
    }
    orgConfig = organizationConfiguration as BotConfig;
  }

  let repoConfig: BotConfig | undefined;
  if (repositoryConfiguration) {
    const valid = validateBotConfig(repositoryConfiguration);
    if (!valid) {
      let errMsg = getErrorMsg(validateBotConfig.errors as DefinedError[]);
      if (errMsg) {
        errMsg = `Invalid repo configuration! \n${errMsg}`;
        if (payload.issue?.number)
          await context.octokit.issues.createComment({
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            issue_number: payload.issue?.number,
            body: errMsg,
          });
        throw new Error(errMsg);
      }
    }
    repoConfig = repositoryConfiguration as BotConfig;
  }

  const merged = merge(ubiquibotConfigDefault, orgConfig, repoConfig);
  const valid = validateBotConfig(merged);
  if (!valid) {
    let errMsg = getErrorMsg(validateBotConfig.errors as DefinedError[]);
    if (errMsg) {
      errMsg = `Invalid merged configuration! \n${errMsg}`;
      if (payload.issue?.number)
        await context.octokit.issues.createComment({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: payload.issue?.number,
          body: errMsg,
        });
      throw new Error(errMsg);
    }
  }

  // this will run transform functions
  try {
    transformConfig(merged);
  } catch (err) {
    if (err instanceof Error && payload.issue?.number)
      await context.octokit.issues.createComment({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.issue?.number,
        body: `Config error!\n${err.toString()}`,
      });
    throw err;
  }

  console.dir(merged, { depth: null, colors: true });
  return merged as BotConfig;
}

// Transforming the config only works with Typebox and not Ajv
// When you use Decode() it not only transforms the values but also validates the whole config and Typebox doesn't return all errors so we can filter for correct ones
// That's why we have transform every field manually and catch errors
export function transformConfig(config: BotConfig) {
  let errorMsg = "";
  try {
    config.timers.reviewDelayTolerance = Value.Decode(stringDuration(), config.timers.reviewDelayTolerance);
  } catch (err: any) {
    if (err.value) {
      errorMsg += `Invalid reviewDelayTolerance value: ${err.value}\n`;
    }
  }
  try {
    config.timers.taskStaleTimeoutDuration = Value.Decode(stringDuration(), config.timers.taskStaleTimeoutDuration);
  } catch (err: any) {
    if (err.value) {
      errorMsg += `Invalid taskStaleTimeoutDuration value: ${err.value}\n`;
    }
  }
  try {
    config.timers.taskFollowUpDuration = Value.Decode(stringDuration(), config.timers.taskFollowUpDuration);
  } catch (err: any) {
    if (err.value) {
      errorMsg += `Invalid taskFollowUpDuration value: ${err.value}\n`;
    }
  }
  try {
    config.timers.taskDisqualifyDuration = Value.Decode(stringDuration(), config.timers.taskDisqualifyDuration);
  } catch (err: any) {
    if (err.value) {
      errorMsg += `Invalid taskDisqualifyDuration value: ${err.value}\n`;
    }
  }
  if (errorMsg) throw new Error(errorMsg);
}

function getErrorMsg(errors: DefinedError[]) {
  const errorsWithoutStrict = errors.filter((error) => error.keyword !== "additionalProperties");
  return errorsWithoutStrict.length === 0
    ? null
    : errorsWithoutStrict.map((error) => error.instancePath.replaceAll("/", ".") + " " + error.message).join("\n");
}

async function download({
  context,
  repository,
  owner,
}: {
  context: ProbotContext;
  repository: string;
  owner: string;
}): Promise<string | null> {
  if (!repository || !owner) throw new Error("Repo or owner is not defined");
  try {
    const { data } = await context.octokit.rest.repos.getContent({
      owner,
      repo: repository,
      path: UBIQUIBOT_CONFIG_FULL_PATH,
      mediaType: { format: "raw" },
    });
    return data as unknown as string; // this will be a string if media format is raw
  } catch (err) {
    return null;
  }
}

export function parseYaml(data: null | string) {
  try {
    if (data) {
      const parsedData = YAML.parse(data);
      return parsedData ?? null;
    }
  } catch (error) {
    const logger = Runtime.getState().logger;
    logger.error("Failed to parse YAML", { error });
  }
  return null;
}
