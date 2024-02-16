import { calculateWeight } from "../../helpers";
import { BotContext } from "../../types";

export const calculateBountyPrice = (context: BotContext, timeValue: number, priorityValue: number, baseValue?: number): number => {
  const botConfig = context.botConfig;
  const base = baseValue ?? botConfig.price.baseMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = 1000 * base * timeValue * priority;
  return price;
};

export const getTargetPriceLabel = (context: BotContext, timeLabel: string | undefined, priorityLabel: string | undefined): string | undefined => {
  const botConfig = context.botConfig;
  let targetPriceLabel: string | undefined = undefined;
  if (timeLabel && priorityLabel) {
    const timeWeight = calculateWeight(botConfig.price.timeLabels.find((item) => item.name === timeLabel));
    const priorityWeight = calculateWeight(botConfig.price.priorityLabels.find((item) => item.name === priorityLabel));
    if (timeWeight && priorityWeight) {
      const bountyPrice = calculateBountyPrice(context, timeWeight, priorityWeight);
      targetPriceLabel = `Price: ${bountyPrice} USD`;
    }
  }
  return targetPriceLabel;
};
