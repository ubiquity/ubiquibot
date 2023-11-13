import { Context as ProbotContext } from "probot";
import { generateConfiguration } from "../utils/generate-configuration";
import { BotConfig } from "../types/configuration-types";

export async function loadConfiguration(context: ProbotContext): Promise<BotConfig> {
  const configuration = await generateConfiguration(context);
  console.trace({ configuration });
  return configuration;
}
