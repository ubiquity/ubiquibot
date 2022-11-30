import { getBotConfig, getBotContext } from "../../bindings";
import { createLabel, listLabelsForRepo } from "../../helpers";
import { calculateBountyPrice } from "./calculate";

/**
 * @dev This just checks all the labels in the config have been set in gh issue
 *  If there's something missing, they will be added
 */
export const validatePriceLabels = async (): Promise<void> => {
  const config = getBotConfig();
  const { log } = getBotContext();
  const timelabels = config.price.timeLabels.map((i) => i.name);
  const profitLabels = config.price.profitLabels.map((i) => i.name);
  const targetLabels1 = config.price.timeLabels.map((i) => i.target);
  const targetLabels2 = config.price.profitLabels.map((i) => i.target);
  const aiLabels: string[] = [];
  for (const timeLabel of config.price.timeLabels) {
    for (const profitLabel of config.price.profitLabels) {
      const targetPrice = calculateBountyPrice(timeLabel.weight, profitLabel.weight, config.price.baseMultiplier);
      const targetPriceLabel = `Price: ${targetPrice} USDC`;
      aiLabels.push(targetPriceLabel);
    }
  }

  const neededLabels: string[] = [...timelabels, ...profitLabels, ...targetLabels1, ...targetLabels2, ...aiLabels];
  log.debug("Got needed labels for setting up price", neededLabels);

  // List all the labels for a repository
  const repoLabels = await listLabelsForRepo();

  // Get the missing labels
  const missingLabels = neededLabels.filter((label) => !repoLabels.includes(label));

  // Create missing labels
  if (missingLabels.length > 0) {
    log.info(`Creating missing labels: ${missingLabels}`);
    await Promise.all(missingLabels.map((label) => createLabel(label)));
  }
};
