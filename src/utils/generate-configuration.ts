import merge from "lodash/merge";
import { Context as ProbotContext } from "probot";
import YAML from "yaml";
import Runtime from "../bindings/bot-runtime";
import { Payload, BotConfig, validateBotConfig, BotConfigSchema } from "../types";
import { DefinedError } from "ajv";
import { Value } from "@sinclair/typebox/value";

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
      const err = generateValidationError(validateBotConfig.errors as DefinedError[]);
      if (err instanceof Error) throw err;
      if (payload.issue?.number)
        await context.octokit.issues.createComment({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: payload.issue?.number,
          body: err,
        });
    }
    orgConfig = organizationConfiguration as BotConfig;
  }

  let repoConfig: BotConfig | undefined;
  if (repositoryConfiguration) {
    const valid = validateBotConfig(repositoryConfiguration);
    if (!valid) {
      const err = generateValidationError(validateBotConfig.errors as DefinedError[]);
      if (err instanceof Error) throw err;
      if (payload.issue?.number)
        await context.octokit.issues.createComment({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: payload.issue?.number,
          body: err,
        });
    }
    repoConfig = repositoryConfiguration as BotConfig;
  }

  let merged = merge({}, orgConfig, repoConfig);
  const valid = validateBotConfig(merged);
  if (!valid) {
    const err = generateValidationError(validateBotConfig.errors as DefinedError[]);
    if (err instanceof Error) throw err;
    if (payload.issue?.number)
      await context.octokit.issues.createComment({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.issue?.number,
        body: err,
      });
  }

  // this will run transform functions
  try {
    merged = Value.Decode(BotConfigSchema, merged);
  } catch (err) {
    console.error(JSON.stringify(err, null, 2));
    throw err;
  }

  console.dir(merged, { depth: null, colors: true });
  return merged as BotConfig;
}

function generateValidationError(errors: DefinedError[]): Error | string {
  const errorsWithoutStrict = errors.filter((error) => error.keyword !== "additionalProperties");
  const errorsOnlyStrict = errors.filter((error) => error.keyword === "additionalProperties");
  const isValid = errorsWithoutStrict.length === 0;
  const message = `${isValid ? "Valid" : "Invalid"} configuration.
${!isValid && "Errors: \n" + errorsWithoutStrict.map((error) => error.message).join("\n")}
${
  errorsOnlyStrict.length > 0
    ? `Warning! Unneccesary properties: 
      ${errorsOnlyStrict
        .map(
          (error) =>
            error.keyword === "additionalProperties" && error.instancePath + "/" + error.params.additionalProperty
        )
        .join("\n")}`
    : ""
}`;
  return isValid ? message : new Error(message);
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
