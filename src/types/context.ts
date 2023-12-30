import { Context as ProbotContext, ProbotOctokit } from "probot";
import OpenAI from "openai";
import { BotConfig } from "./configuration-types";
import { Payload } from "./payload";
import { Logs } from "ubiquibot-logger";

export interface Context {
  event: ProbotContext;
  config: BotConfig;
  openAi: OpenAI | null;
  logger: Logs;
  payload: Payload;
  octokit: InstanceType<typeof ProbotOctokit>;
}
