import { Context as ProbotContext } from "probot";
import { BotConfig } from "./";

export interface Context {
  event: ProbotContext;
  config: BotConfig;
}
