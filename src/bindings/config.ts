import { BotConfig, BotConfigSchema } from "../types";
import fs from "fs";
import path from "path";
import { DefaultPriceConfig, DEFAULT_BOT_DELAY } from "../configs";
import { ajv } from "../utils";
import { getFallback } from "../utils/fallback";

export const loadConfig = async (): Promise<BotConfig> => {
  let configFile: any = {};
  const configFilePath = path.join(__dirname, "./config.json");
  if (fs.existsSync(configFilePath)) {
    configFile = await import(configFilePath);
  }

  const botConfig: BotConfig = {
    price: {
      baseMultiplier: process.env.BASE_MULTIPLIER ? Number(process.env.BASE_MULTIPLIER) : configFile.baseMultiplier ?? DefaultPriceConfig.baseMultiplier,
      timeLabels: configFile.timeLabels ?? DefaultPriceConfig.timeLabels,
      priorityLabels: configFile.priorityLabels ?? DefaultPriceConfig.priorityLabels,
    },
    supabase: {
      url: process.env.SUPABASE_PROJECT_URL ?? "",
      key: process.env.SUPABASE_PROJECT_KEY ?? "",
    },
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN ?? "",
      delay: process.env.TELEGRAM_BOT_DELAY ? Number(process.env.TELEGRAM_BOT_DELAY) : DEFAULT_BOT_DELAY,
    },
    git: {
      org: process.env.ORG_NAME ?? getFallback("ubiquity", "Org"),
      repo: process.env.REPO_NAME ?? getFallback("ubiquity-dollar", "Repo"),
    },
  };

  const validate = ajv.compile(BotConfigSchema);
  const valid = validate(botConfig);
  if (!valid) {
    throw new Error(`Config schema validation failed!!!, config: ${botConfig}`);
  }

  return botConfig;
};
