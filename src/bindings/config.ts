import ms from "ms";

import { BotConfig, BotConfigSchema, LogLevel } from "../types";
import { getPayoutConfigByNetworkId } from "../helpers";
import { ajv } from "../utils";
import { Context } from "probot";
import { getScalarKey, getWideConfig } from "../utils/private";

export const loadConfig = async (context: Context): Promise<BotConfig> => {
  const {
    baseMultiplier,
    timeLabels,
    privateKey,
    priorityLabels,
    incentives,
    paymentPermitMaxPrice,
    disableAnalytics,
    bountyHunterMax,
    incentiveMode,
    networkId,
    issueCreatorMultiplier,
    defaultLabels,
    promotionComment,
    commandSettings,
    assistivePricing,
    registerWalletWithVerification,
    staleBountyTime,
    enableAccessControl,
    openAIKey,
    openAITokenLimit,
    newContributorGreeting,
    timeRangeForMaxIssueEnabled,
    timeRangeForMaxIssue,
    permitBaseUrl,
    botDelay,
    followUpTime,
    disqualifyTime,
  } = await getWideConfig(context);

  const publicKey = await getScalarKey(process.env.X25519_PRIVATE_KEY);
  const { rpc, paymentToken } = getPayoutConfigByNetworkId(networkId);

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
      networkId: networkId,
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
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN ?? "",
      delay: process.env.TELEGRAM_BOT_DELAY ? Number(process.env.TELEGRAM_BOT_DELAY) : botDelay,
    },
    logNotification: {
      url: process.env.LOG_WEBHOOK_BOT_URL || "",
      secret: process.env.LOG_WEBHOOK_SECRET || "",
      groupId: Number(process.env.LOG_WEBHOOK_GROUP_ID) || 0,
      topicId: Number(process.env.LOG_WEBHOOK_TOPIC_ID) || 0,
      enabled: true,
    },
    mode: {
      paymentPermitMaxPrice: paymentPermitMaxPrice,
      disableAnalytics: disableAnalytics,
      incentiveMode: incentiveMode,
      assistivePricing: assistivePricing,
    },
    command: commandSettings,
    assign: {
      bountyHunterMax: bountyHunterMax,
      staleBountyTime: ms(staleBountyTime),
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
    accessControl: enableAccessControl,
    newContributorGreeting: newContributorGreeting,
  };

  if (botConfig.payout.privateKey == "") {
    botConfig.mode.paymentPermitMaxPrice = 0;
  }

  if (botConfig.logNotification.secret == "" || botConfig.logNotification.groupId == 0 || botConfig.logNotification.url == "") {
    botConfig.logNotification.enabled = false;
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
