import Runtime from "../../bindings/bot-runtime";
import { calculateLabelValue, createLabel, listLabelsForRepo } from "../../helpers";
import { calculateTaskPrice } from "../shared/pricing";

// This just checks all the labels in the config have been set in gh issue
// If there's something missing, they will be added

export async function syncPriceLabelsToConfig() {
  const runtime = Runtime.getState();
  const config = runtime.botConfig;
  const logger = runtime.logger;

  const { assistivePricing } = config.mode;

  if (!assistivePricing) {
    logger.info(`Assistive pricing is disabled`);
    return;
  }

  const timeLabels = config.price.timeLabels.map((i) => i.name);
  const priorityLabels = config.price.priorityLabels.map((i) => i.name);
  const aiLabels: string[] = [];
  for (const timeLabel of config.price.timeLabels) {
    for (const priorityLabel of config.price.priorityLabels) {
      const targetPrice = calculateTaskPrice(
        calculateLabelValue(timeLabel),
        calculateLabelValue(priorityLabel),
        config.price.priceMultiplier
      );
      const targetPriceLabel = `Price: ${targetPrice} USD`;
      aiLabels.push(targetPriceLabel);
    }
  }

  const neededLabels: string[] = [...timeLabels, ...priorityLabels];
  logger.debug("Got needed labels for setting up price ", { neededLabels });

  // List all the labels for a repository
  const repoLabels = await listLabelsForRepo();

  // Get the missing labels
  const missingLabels = neededLabels.filter((label) => !repoLabels.map((i) => i.name).includes(label));

  // Create missing labels
  if (missingLabels.length > 0) {
    logger.info("Missing labels found, creating them", { missingLabels });
    await Promise.all(missingLabels.map((label) => createLabel(label)));
    logger.info(`Creating missing labels done`);
  }
}
