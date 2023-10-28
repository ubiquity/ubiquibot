import ms from "ms";
import { getPayoutConfigByNetworkId } from "../helpers";
import { ajv, validateTypes } from "../utils";
import { Context } from "probot";
import { generateConfiguration } from "../utils/generate-configuration";
import { LogLevel } from "../adapters/supabase/helpers/tables/logs";
import Runtime from "./bot-runtime";
import { AllConfigurationTypes, PublicConfigurationValues } from "../types/configuration";
import defaultConfiguration from "../ubiquibot-config-default";

const defaultConfigValidation = validateTypes(PublicConfigurationValues, defaultConfiguration); // validate default config
if (defaultConfigValidation.error) {
  throw new Error(defaultConfigValidation.error);
}

export async function loadConfiguration(context: Context): Promise<AllConfigurationTypes> {
  // const runtime = Runtime.getState();
  const configuration = await generateConfiguration(context);
  console.trace({ configuration });
  return configuration;

  // const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);
  // const botConfig: AllConfigurationTypes = {
  //   log: {
  //     logEnvironment: process.env.LOG_ENVIRONMENT || "production",
  //     level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.SILLY,
  //     retryLimit: Number(process.env.LOG_RETRY) || 0,
  //   },
  //   price: { basePriceMultiplier, issueCreatorMultiplier, timeLabels, priorityLabels, incentives, defaultLabels },
  //   comments: { promotionComment: promotionComment },
  //   payout: {
  //     evmNetworkId: evmNetworkId,
  //     rpc: rpc,
  //     privateKey: keys.private,
  //     publicKey: keys.public,
  //     paymentToken: paymentToken,
  //   },
  //   unassign: {
  //     reviewDelayTolerance: reviewDelayTolerance,
  //     taskFollowUpDuration: taskFollowUpDuration,
  //     taskDisqualifyDuration: taskDisqualifyDuration,
  //   },
  //   supabase: { url: process.env.SUPABASE_URL || null, key: process.env.SUPABASE_KEY || null },
  //   mode: { maxPermitPrice, assistivePricing },
  //   command: commandSettings,
  //   assign: { maxConcurrentTasks: maxConcurrentTasks, taskStaleTimeoutDuration: ms(taskStaleTimeoutDuration) },
  //   sodium: { privateKey: keys.private, publicKey: keys.public },
  //   wallet: { registerWalletWithVerification: registerWalletWithVerification },
  //   ask: { apiKey: process.env.OPENAI_API_KEY || openAIKey },
  //   publicAccessControl: publicAccessControl,
  //   newContributorGreeting: newContributorGreeting,
  // };
  // if (botConfig.payout.privateKey == null) {
  //   botConfig.mode.maxPermitPrice = 0;
  // }
  // const validate = ajv.compile(BotConfigSchema);
  // const valid = validate(botConfig);
  // if (!valid) {
  //   throw new Error(JSON.stringify(validate.errors, null, 2));
  // }
  // if (botConfig.unassign.taskFollowUpDuration < 0 || botConfig.unassign.taskDisqualifyDuration < 0) {
  //   throw runtime.logger.error(
  //     "Invalid time interval, taskFollowUpDuration or taskDisqualifyDuration cannot be negative",
  //     {
  //       taskFollowUpDuration: botConfig.unassign.taskFollowUpDuration,
  //       taskDisqualifyDuration: botConfig.unassign.taskDisqualifyDuration,
  //     }
  //   );
  // }
  // return botConfig;
}
