import { Context as ProbotContext, ProbotOctokit } from "probot";
import { BotConfig, Payload } from "./";
import OpenAI from "openai";
import { Logs } from "../adapters/supabase";

export interface Context {
  event: ProbotContext;
  config: BotConfig;
  openAi: OpenAI | null;
  logger: Logs;
  payload: Payload;
  octokit: InstanceType<typeof ProbotOctokit>;
}
