import ms from "ms";

import { BotConfig, BotConfigSchema } from "../types";
import {
  DEFAULT_BOT_DELAY,
  DEFAULT_DISQUALIFY_TIME,
  DEFAULT_FOLLOWUP_TIME,
  DEFAULT_PAYMENT_TOKEN,
  DEFAULT_PERMIT_BASE_URL,
  DEFAULT_RPC_ENDPOINT,
} from "../configs";
import { ajv } from "../utils";
import { Context } from "probot";
import { getScalarKey, getWideConfig } from "../utils/private";

export const loadConfig = async (context: Context): Promise<BotConfig> => {
  const { privateKey, baseMultiplier, timeLabels, priorityLabels, autoPayMode, analyticsMode, bountyHunterMax, chainId } = await getWideConfig(context);
  const publicKey = await getScalarKey(process.env.X25519_PRIVATE_KEY);

  const botConfig: BotConfig = {
    log: {
      level: process.env.LOG_LEVEL || "deubg",
      ingestionKey: process.env.LOGDNA_INGESTION_KEY ?? "",
    },
    price: {
      baseMultiplier: baseMultiplier,
      timeLabels: timeLabels,
      priorityLabels: priorityLabels,
    },
    payout: {
      chainId: chainId,
      rpc: process.env.RPC_PROVIDER_URL || DEFAULT_RPC_ENDPOINT,
      privateKey: privateKey,
      paymentToken: process.env.PAYMENT_TOKEN || DEFAULT_PAYMENT_TOKEN,
      permitBaseUrl: process.env.PERMIT_BASE_URL || DEFAULT_PERMIT_BASE_URL,
    },
    unassign: {
      followUpTime: ms(process.env.FOLLOW_UP_TIME || DEFAULT_FOLLOWUP_TIME),
      disqualifyTime: ms(process.env.DISQUALIFY_TIME || DEFAULT_DISQUALIFY_TIME),
    },
    supabase: {
      url: process.env.SUPABASE_URL ?? "",
      key: process.env.SUPABASE_KEY ?? "",
    },
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN ?? "",
      delay: process.env.TELEGRAM_BOT_DELAY ? Number(process.env.TELEGRAM_BOT_DELAY) : DEFAULT_BOT_DELAY,
    },
    mode: {
      autoPayMode: autoPayMode,
      analyticsMode: analyticsMode,
    },
    assign: {
      bountyHunterMax: bountyHunterMax,
    },
    sodium: {
      privateKey: process.env.X25519_PRIVATE_KEY ?? "",
      publicKey: publicKey ?? "",
    },
  };

  if (botConfig.log.ingestionKey == "") {
    throw new Error("LogDNA ingestion key missing");
  }

  if (botConfig.payout.privateKey == "") {
    botConfig.mode.autoPayMode = false;
  }

  const validate = ajv.compile(BotConfigSchema);
  const valid = validate(botConfig);
  if (!valid) {
    throw new Error(`Config schema validation failed!!!, config: ${botConfig}`);
  }

  if (botConfig.unassign.followUpTime < 0 || botConfig.unassign.disqualifyTime < 0) {
    throw new Error(`Invalid time interval, followUpTime: ${botConfig.unassign.followUpTime}, disqualifyTime: ${botConfig.unassign.disqualifyTime}`);
  }

  return botConfig;
};
