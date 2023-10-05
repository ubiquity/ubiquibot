import ms from "ms";

import { BotConfig, BotConfigSchema, LogLevel } from "../types";

import { getPayoutConfigByNetworkId } from "../helpers";
import { ajv } from "../utils";
import { Context } from "probot";
import { getScalarKey, getConfig } from "../utils/private";

export const loadConfig = async (context: Context): Promise<BotConfig> => {
  const {
    assistivePricing,
    baseMultiplier,
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
    privateKey,
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

  const publicKey = await getScalarKey(process.env.X25519_PRIVATE_KEY);
  const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);

  const botConfig: BotConfig = {
    log: {
      logEnvironment: process.env.LOG_ENVIRONMENT || "production",
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.DEBUG,
      retryLimit: Number(process.env.LOG_RETRY) || 0,
    },
    price: { baseMultiplier, issueCreatorMultiplier, timeLabels, priorityLabels, incentives, defaultLabels },
    comments: { promotionComment: promotionComment },
    payout: {
      evmNetworkId: evmNetworkId,
      rpc: rpc,
      privateKey: privateKey,
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
      url: process.env.SUPABASE_URL ?? "",
      key: process.env.SUPABASE_KEY ?? "",
    },

    logNotification: {
      url: process.env.LOG_WEBHOOK_BOT_URL || "",
      secret: process.env.LOG_WEBHOOK_SECRET || "",
      groupId: Number(process.env.LOG_WEBHOOK_GROUP_ID) || 0,
      topicId: Number(process.env.LOG_WEBHOOK_TOPIC_ID) || 0,
      enabled: true,
    },
    mode: { permitMaxPrice, disableAnalytics, incentiveMode, assistivePricing },
    command: commandSettings,
    assign: { maxConcurrentTasks: maxConcurrentTasks, staleTaskTime: ms(staleTaskTime) },
    sodium: { privateKey: process.env.X25519_PRIVATE_KEY ?? "", publicKey: publicKey ?? "" },
    wallet: { registerWalletWithVerification: registerWalletWithVerification },
    ask: { apiKey: process.env.OPENAI_API_KEY || openAIKey, tokenLimit: openAITokenLimit || 0 },
    publicAccessControl: publicAccessControl,
    newContributorGreeting: newContributorGreeting,
  };

  if (botConfig.payout.privateKey == "") {
    botConfig.mode.permitMaxPrice = 0;
  }

  if (
    botConfig.logNotification.secret == "" ||
    botConfig.logNotification.groupId == 0 ||
    botConfig.logNotification.url == ""
  ) {
    botConfig.logNotification.enabled = false;
  }

  const validate = ajv.compile(BotConfigSchema);
  const valid = validate(botConfig);
  if (!valid) {
    throw new Error(validate.errors?.map((err: unknown) => JSON.stringify(err, null, 2)).join(","));
  }

  if (botConfig.unassign.followUpTime < 0 || botConfig.unassign.disqualifyTime < 0) {
    throw new Error(
      `Invalid time interval, followUpTime: ${botConfig.unassign.followUpTime}, disqualifyTime: ${botConfig.unassign.disqualifyTime}`
    );
  }

  return botConfig;
};
