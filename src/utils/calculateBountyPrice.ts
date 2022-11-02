import { LabelAndIndex } from "../index";

export function calculateBountyPrice(
  lowestTime: LabelAndIndex,
  lowestProfit: LabelAndIndex
) {
  // from profit should parse and multiply the percentage
  // from time should multiply the index + 1
  // base value to begin with is 1000
  const baseValue = 1000;
  const timeIndex = lowestTime.index + 1;
  const profitPercentageRegexResult = lowestProfit.lowest.name.match(/\d+/gim);
  if (!profitPercentageRegexResult) {
    throw new Error(
      "failed to parse the percentage out of the profit label name"
    );
  }
  const percentage = Number(profitPercentageRegexResult.shift()) / 100;
  console.log({
    baseValue,
    timeIndex,
    percentage,
  });
  return baseValue * timeIndex * percentage;
}
