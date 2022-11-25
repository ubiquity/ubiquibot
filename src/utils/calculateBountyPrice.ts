import { LowestLabel } from "./getLowest";

export function calculateBountyPrice(lowestTime: LowestLabel, lowestProfit: LowestLabel) {
  const base = 1000;
  const time = lowestTime.value;
  const profit = lowestProfit.value / 10; // floats cause bad math
  const price = base * time * profit;
  return price;
}
