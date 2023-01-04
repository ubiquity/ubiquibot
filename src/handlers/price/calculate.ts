import { getBotConfig } from "../../bindings";

export const calculateBountyPrice = (timeValue: number, priorityValue: number, baseValue?: number): number => {
  const botConfig = getBotConfig();
  const base = baseValue ?? botConfig.price.baseMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = base * timeValue * priority;
  return price;
};
