import ms from "ms";

import { BotConfig, BotConfigSchema, LogLevel } from "../types";
import {
  DEFAULT_BOT_DELAY,
  DEFAULT_DISQUALIFY_TIME,
  DEFAULT_FOLLOWUP_TIME,
  DEFAULT_PERMIT_BASE_URL,
  DEFAULT_TIME_RANGE_FOR_MAX_ISSUE,
  DEFAULT_TIME_RANGE_FOR_MAX_ISSUE_ENABLED,
} from "../configs";
import { getPayoutConfigByNetworkId } from "../helpers";
import { ajv } from "../utils";
import { Context } from "probot";
import { getScalarKey, getConfig } from "../utils/private";

export const loadConfig = async (context: Context): Promise<BotConfig> => {
  const {
    baseMultiplier,
    timeLabels,
    privateKey,
    priorityLabels,
    incentives,
    permitMaxPrice,
    disableAnalytics,
    maxConcurrentTasks,
    incentiveMode,
    evmNetworkId,
    issueCreatorMultiplier,
    defaultLabels,
    promotionComment,
    commandSettings,
    assistivePricing,
    registerWalletWithVerification,
    staleTaskTime,
    publicAccessControl,
    openAIKey,
    openAITokenLimit,
    newContributorGreeting,
  } = await getConfig(context);

  const publicKey = await getScalarKey(process.env.X25519_PRIVATE_KEY);
  const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);

  const botConfig: BotConfig = {
    log: {
      logEnvironment: process.env.LOG_ENVIRONMENT || "production",
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.DEBUG,
      retryLimit: Number(process.env.LOG_RETRY) || 0,
    },
    price: {
      baseMultiplier,
      issueCreatorMultiplier,
      timeLabels,
      priorityLabels,
      incentives,
      defaultLabels,
    },
    comments: {
      promotionComment: promotionComment,
    },
    payout: {
      evmNetworkId: evmNetworkId,
      rpc: rpc,
      privateKey: privateKey,
      paymentToken: paymentToken,
      permitBaseUrl: process.env.PERMIT_BASE_URL || DEFAULT_PERMIT_BASE_URL,
    },
    unassign: {
      timeRangeForMaxIssue: process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE
        ? Number(process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE)
        : DEFAULT_TIME_RANGE_FOR_MAX_ISSUE,
      timeRangeForMaxIssueEnabled: process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE_ENABLED
        ? process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE_ENABLED == "true"
        : DEFAULT_TIME_RANGE_FOR_MAX_ISSUE_ENABLED,
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
      permitMaxPrice: permitMaxPrice,
      disableAnalytics: disableAnalytics,
      incentiveMode: incentiveMode,
      assistivePricing: assistivePricing,
    },
    command: commandSettings,
    assign: {
      maxConcurrentTasks: maxConcurrentTasks,
      staleTaskTime: ms(staleTaskTime),
    },
    sodium: {
      privateKey: process.env.X25519_PRIVATE_KEY ?? "",
      publicKey: publicKey ?? "",
    },
    wallet: {
      registerWalletWithVerification: registerWalletWithVerification,
    },
    ask: {
      apiKey: openAIKey,
      tokenLimit: openAITokenLimit || 0,
    },
    publicAccessControl: publicAccessControl,
    newContributorGreeting: newContributorGreeting,
  };

  if (botConfig.payout.privateKey == "") {
    botConfig.mode.permitMaxPrice = 0;
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
