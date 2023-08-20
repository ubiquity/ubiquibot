import ms from "ms";

import { BotConfig, BotConfigSchema } from "../types";
import { DEFAULT_BOT_DELAY, DEFAULT_DISQUALIFY_TIME, DEFAULT_FOLLOWUP_TIME, DEFAULT_PERMIT_BASE_URL } from "../configs";
import { getPayoutConfigByNetworkId } from "../helpers";
import { ajv } from "../utils";
import { Context } from "probot";
import { getScalarKey, getAllConfigs as getConfig } from "../utils/private";

export const loadConfig = async (context: Context): Promise<BotConfig> => {
  const {
    baseMultiplier,
    timeLabels,
    privateKey,
    priorityLabels,
    commentElementPricing,
    paymentPermitMaxPrice,
    disableAnalytics,
    maxConcurrentAssigns,
    incentiveMode,
    evmNetworkId,
    issueCreatorMultiplier,
    defaultLabels,
    promotionComment,
    commandSettings,
    assistivePricing,
    registerWalletWithVerification,
  } = await getConfig(context);

  const publicKey = await getScalarKey(process.env.X25519_PRIVATE_KEY);
  const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);

  const botConfig: BotConfig = {
    log: {
      level: process.env.LOG_LEVEL || "debug",
      ingestionKey: process.env.LOGDNA_INGESTION_KEY ?? "",
    },
    price: {
      baseMultiplier,
      issueCreatorMultiplier,
      timeLabels: timeLabels ?? [],
      priorityLabels: priorityLabels ?? [],
      commentElementPricing: commentElementPricing,
      defaultLabels: defaultLabels ?? [],
    },
    comments: {
      promotionComment: promotionComment ?? "",
    },
    payout: {
      evmNetworkId: evmNetworkId,
      rpc: rpc,
      privateKey: privateKey,
      paymentToken: paymentToken,
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
      paymentPermitMaxPrice: paymentPermitMaxPrice,
      disableAnalytics: disableAnalytics ?? false,
      incentiveMode: incentiveMode ?? false,
      assistivePricing: assistivePricing ?? false,
    },
    command: commandSettings ?? [{ name: "", enabled: false }],
    assign: {
      maxConcurrentAssigns: maxConcurrentAssigns,
    },
    sodium: {
      privateKey: process.env.X25519_PRIVATE_KEY ?? "",
      publicKey: publicKey ?? "",
    },
    wallet: {
      registerWalletWithVerification: registerWalletWithVerification ?? false,
    },
  };

  if (botConfig.log.ingestionKey == "") {
    throw new Error("LogDNA ingestion key missing");
  }

  if (botConfig.payout.privateKey == "") {
    botConfig.mode.paymentPermitMaxPrice = 0;
  }

  const validate = ajv.compile(BotConfigSchema);
  const valid = validate(botConfig);
  if (!valid) {
    throw new Error(validate.errors?.map((err: unknown) => JSON.stringify(err, null, 2)).join(","));
  }

  if (botConfig.unassign.followUpTime < 0 || botConfig.unassign.disqualifyTime < 0) {
    throw new Error(`Invalid time interval, followUpTime: ${botConfig.unassign.followUpTime}, disqualifyTime: ${botConfig.unassign.disqualifyTime}`);
  }

  return botConfig;
};
