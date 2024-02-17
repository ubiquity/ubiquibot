import OpenAI from "openai";
import { Context as ProbotContext, ProbotOctokit } from "probot";
import { Logs } from "ubiquibot-logger";
import { BotConfig } from "./configuration-types";
import { GitHubPayload } from "./payload";

export interface Context {
  event: ProbotContext;
  config: BotConfig;
  openAi: OpenAI | null;
  logger: Logs;
  payload: GitHubPayload;
  octokit: InstanceType<typeof ProbotOctokit>;
}
