import { getBotConfig } from "../../bindings";
import { calculateWeight } from "../../helpers";

export const calculateTaskPrice = (timeValue: number, priorityValue: number, baseValue?: number): number => {
  const botConfig = getBotConfig();
  const base = baseValue ?? botConfig.price.baseMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = 1000 * base * timeValue * priority;
  return price;
};

export const getTargetPriceLabel = (
  timeLabel: string | undefined,
  priorityLabel: string | undefined
): string | undefined => {
  const botConfig = getBotConfig();
  let targetPriceLabel: string | undefined = undefined;
  if (timeLabel && priorityLabel) {
    const timeWeight = calculateWeight(botConfig.price.timeLabels.find((item) => item.name === timeLabel));
    const priorityWeight = calculateWeight(botConfig.price.priorityLabels.find((item) => item.name === priorityLabel));
    if (timeWeight && priorityWeight) {
      const taskPrice = calculateTaskPrice(timeWeight, priorityWeight);
      targetPriceLabel = `Price: ${taskPrice} USD`;
    }
  }
  return targetPriceLabel;
};
