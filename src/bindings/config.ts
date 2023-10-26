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
    reviewDelayTolerance,
    permitBaseUrl,
    taskFollowUpDuration,
    taskDisqualifyDuration,
  } = await getConfig(context);

  // const config = await getConfig(context);
  // console.trace(util.inspect(config, { showHidden: true, depth: null, breakLength: Infinity }));

  const runtime = Runtime.getState();

  if (!keys.private) {
    console.trace("X25519_PRIVATE_KEY not defined");
  }

  const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);

  const botConfig: BotConfig = {
    log: {
      logEnvironment: process.env.LOG_ENVIRONMENT || "production",
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.SILLY,
      retryLimit: Number(process.env.LOG_RETRY) || 0,
    },
    price: { priceMultiplier, issueCreatorMultiplier, timeLabels, priorityLabels, incentives, defaultLabels },
    comments: { promotionComment: promotionComment },
    payout: {
      evmNetworkId: evmNetworkId,
      rpc: rpc,
      privateKey: keys.private,
      publicKey: keys.public,
      paymentToken: paymentToken,
      permitBaseUrl: process.env.PERMIT_BASE_URL || permitBaseUrl,
    },
    unassign: {
      reviewDelayTolerance: ms(reviewDelayTolerance),
      taskFollowUpDuration: ms(taskFollowUpDuration),
      taskDisqualifyDuration: ms(taskDisqualifyDuration),
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

  if (botConfig.unassign.taskFollowUpDuration < 0 || botConfig.unassign.taskDisqualifyDuration < 0) {
    throw runtime.logger.error(
      "Invalid time interval, taskFollowUpDuration or taskDisqualifyDuration cannot be negative",
      {
        taskFollowUpDuration: botConfig.unassign.taskFollowUpDuration,
        taskDisqualifyDuration: botConfig.unassign.taskDisqualifyDuration,
      }
    );
  }

  return botConfig;
}
