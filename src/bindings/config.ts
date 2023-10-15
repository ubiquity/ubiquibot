import ms from "ms";

import { BotConfig, BotConfigSchema } from "../types";

import { getPayoutConfigByNetworkId } from "../helpers";
import { ajv } from "../utils";
import { Context } from "probot";
import { getConfig } from "../utils/private";
import { LogLevel } from "../adapters/supabase/helpers/tables/logs";
import Runtime from "./bot-runtime";

export async function loadConfig(context: Context): Promise<BotConfig> {
  const {
    assistivePricing,
    priceMultiplier,
    commandSettings,
    defaultLabels,
    disableAnalytics,
    evmNetworkId,
    incentiveMode,
    incentives,
    issueCreatorMultiplier,
    maxConcurrentTasks,
    openAIKey,
    openAITokenLimit,
    permitMaxPrice,
    priorityLabels,
    keys,
    promotionComment,
    publicAccessControl,
    registerWalletWithVerification,
    staleTaskTime,
    timeLabels,
    newContributorGreeting,
    timeRangeForMaxIssueEnabled,
    timeRangeForMaxIssue,
    permitBaseUrl,
    followUpTime,
    disqualifyTime,
  } = await getConfig(context);

  const runtime = Runtime.getState();

  if (!keys.private) {
    console.trace("X25519_PRIVATE_KEY not defined");
  }

  const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);

  const botConfig: BotConfig = {
    log: {
      logEnvironment: process.env.LOG_ENVIRONMENT || "production",
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.DEBUG,
      retryLimit: Number(process.env.LOG_RETRY) || 0,
    },
    price: { priceMultiplier, issueCreatorMultiplier, timeLabels, priorityLabels, incentives, defaultLabels },
    comments: { promotionComment: promotionComment },
    payout: {
      evmNetworkId: evmNetworkId,
      rpc: rpc,
      privateKey: keys.private,
      paymentToken: paymentToken,
      permitBaseUrl: process.env.PERMIT_BASE_URL || permitBaseUrl,
    },
    unassign: {
      timeRangeForMaxIssue: process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE
        ? Number(process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE)
        : timeRangeForMaxIssue,
      timeRangeForMaxIssueEnabled: process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE_ENABLED
        ? process.env.DEFAULT_TIME_RANGE_FOR_MAX_ISSUE_ENABLED == "true"
        : timeRangeForMaxIssueEnabled,
      followUpTime: ms(process.env.FOLLOW_UP_TIME || followUpTime),
      disqualifyTime: ms(process.env.DISQUALIFY_TIME || disqualifyTime),
    },
    supabase: {
      url: process.env.SUPABASE_URL ?? null,
      key: process.env.SUPABASE_KEY ?? null,
    },

    mode: {
      permitMaxPrice,
      disableAnalytics,
      incentiveMode,
      assistivePricing,
    },
    command: commandSettings,
    assign: { maxConcurrentTasks: maxConcurrentTasks, staleTaskTime: ms(staleTaskTime) },
    sodium: { privateKey: keys.private, publicKey: keys.public },
    wallet: { registerWalletWithVerification: registerWalletWithVerification },
    ask: { apiKey: process.env.OPENAI_API_KEY || openAIKey, tokenLimit: openAITokenLimit || 0 },
    publicAccessControl: publicAccessControl,
    newContributorGreeting: newContributorGreeting,
  };

  if (botConfig.payout.privateKey == null) {
    botConfig.mode.permitMaxPrice = 0;
  }

  const validate = ajv.compile(BotConfigSchema);
  const valid = validate(botConfig);
  if (!valid) {
    throw runtime.logger.error("Invalid config", validate.errors);
  }

  if (botConfig.unassign.followUpTime < 0 || botConfig.unassign.disqualifyTime < 0) {
    throw runtime.logger.error("Invalid time interval, followUpTime or disqualifyTime cannot be negative", {
      followUpTime: botConfig.unassign.followUpTime,
      disqualifyTime: botConfig.unassign.disqualifyTime,
    });
  }

  return botConfig;
}
