import { Context as ProbotContext, ProbotOctokit } from "probot";
import OpenAI from "openai";
import { Logs } from "../adapters/supabase";
import { BotConfig } from "./configuration-types";
import { Payload } from "./payload";

export interface Context {
  event: ProbotContext;
  config: BotConfig;
  openAi: OpenAI | null;
  logger: Logs;
  payload: Payload;
  octokit: InstanceType<typeof ProbotOctokit>;
}
