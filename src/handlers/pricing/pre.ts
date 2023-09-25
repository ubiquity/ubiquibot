import { getBotConfig, getLogger } from "../../bindings";
import { calculateWeight, createLabel, listLabelsForRepo } from "../../helpers";
import { calculateTaskPrice } from "../shared";

/**
 * @dev This just checks all the labels in the config have been set in gh issue
 *  If there's something missing, they will be added
 */
export const validatePriceLabels = async (): Promise<void> => {
  const config = getBotConfig();
  const logger = getLogger();

  const { assistivePricing } = config.mode;

  if (!assistivePricing) {
    logger.info(`Assistive Pricing is disabled`);
    return;
  }

  const timeLabels = config.price.timeLabels.map((i) => i.name);
  const priorityLabels = config.price.priorityLabels.map((i) => i.name);
  const aiLabels: string[] = [];
  for (const timeLabel of config.price.timeLabels) {
    for (const priorityLabel of config.price.priorityLabels) {
      const targetPrice = calculateTaskPrice(calculateWeight(timeLabel), calculateWeight(priorityLabel), config.price.baseMultiplier);
      const targetPriceLabel = `Price: ${targetPrice} USD`;
      aiLabels.push(targetPriceLabel);
    }
  }

  const neededLabels: string[] = [...timeLabels, ...priorityLabels];
  logger.debug(`Got needed labels for setting up price, neededLabels: ${neededLabels.toString()}`);

  // List all the labels for a repository
  const repoLabels = await listLabelsForRepo();

  // Get the missing labels
  const missingLabels = neededLabels.filter((label) => !repoLabels.map((i) => i.name).includes(label));

  // Create missing labels
  if (missingLabels.length > 0) {
    logger.info(`Creating missing labels: ${missingLabels}`);
    await Promise.all(missingLabels.map((label) => createLabel(label)));
    logger.info(`Creating missing labels done`);
  }
};
