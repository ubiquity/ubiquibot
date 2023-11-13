import { Context as ProbotContext } from "probot";
import { BotConfig } from "./";
import OpenAI from "openai";

export interface Context {
  event: ProbotContext;
  config: BotConfig;
  openAi: OpenAI | null;
}
