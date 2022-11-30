import { getBotConfig } from "../../bindings";

export const calculateBountyPrice = (timeValue: number, profitValue: number, baseValue?: number): number => {
  const botConfig = getBotConfig();
  const base = baseValue ?? botConfig.price.baseMultiplier;
  const profit = profitValue / 10; // floats cause bad math
  const price = base * timeValue * profit;
  return price;
};
