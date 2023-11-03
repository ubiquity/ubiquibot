import Runtime from "../../bindings/bot-runtime";
import { calculateLabelValue, createLabel, listLabelsForRepo } from "../../helpers";
import { Context } from "../../types";
import { calculateTaskPrice } from "../shared/pricing";

// This just checks all the labels in the config have been set in gh issue
// If there's something missing, they will be added

export async function syncPriceLabelsToConfig(context: Context) {
  const runtime = Runtime.getState();
  const config = context.config;
  const logger = runtime.logger;

  const {
    features: { assistivePricing },
    labels,
  } = config;

  if (!assistivePricing) {
    logger.info(`Assistive pricing is disabled`);
    return;
  }

  const timeLabels = labels.time.map((i) => i.name);
  const priorityLabels = labels.priority.map((i) => i.name);
  const aiLabels: string[] = [];
  for (const timeLabel of config.labels.time) {
    for (const priorityLabel of config.labels.priority) {
      const targetPrice = calculateTaskPrice(
        context,
        calculateLabelValue(timeLabel),
        calculateLabelValue(priorityLabel),
        config.payments.basePriceMultiplier
      );
      const targetPriceLabel = `Price: ${targetPrice} USD`;
      aiLabels.push(targetPriceLabel);
    }
  }

  const pricingLabels: string[] = [...timeLabels, ...priorityLabels];

  // List all the labels for a repository
  const allLabels = await listLabelsForRepo(context);

  // Get the missing labels
  const missingLabels = pricingLabels.filter((label) => !allLabels.map((i) => i.name).includes(label));

  // Create missing labels
  if (missingLabels.length > 0) {
    logger.info("Missing labels found, creating them", { missingLabels });
    await Promise.all(missingLabels.map((label) => createLabel(context, label)));
    logger.info(`Creating missing labels done`);
  }
}
