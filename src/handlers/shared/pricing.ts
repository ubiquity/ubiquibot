import { getBotConfig } from "../../bindings";

export const calculateBountyPrice = (timeValue: number, priorityValue: number, baseValue?: number): number => {
  const botConfig = getBotConfig();
  const base = baseValue ?? botConfig.price.baseMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = 1000 * base * timeValue * priority;
  return price;
};

export const getTargetPriceLabel = (timeLabel: string | undefined, priorityLabel: string | undefined): string | undefined => {
  const botConfig = getBotConfig();
  let targetPriceLabel: string | undefined = undefined;
  if (timeLabel && priorityLabel) {
    const timeWeight = botConfig.price.timeLabels.find((item) => item.name === timeLabel)?.weight;
    const priorityWeight = botConfig.price.priorityLabels.find((item) => item.name === priorityLabel)?.weight;
    if (timeWeight && priorityWeight) {
      const bountyPrice = calculateBountyPrice(timeWeight, priorityWeight);
      targetPriceLabel = `Price: ${bountyPrice} USD`;
    }
  }
  return targetPriceLabel;
};
