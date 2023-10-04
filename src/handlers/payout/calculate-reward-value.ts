import { Incentives } from "../../types";
import Decimal from "decimal.js";

export function calculateRewardValue(comments: Record<string, string[]>, incentives: Incentives): Decimal {
  //  Calculates the reward values for a given comments. We'll improve the formula whenever we get the better one.
  let sum = new Decimal(0);
  for (const key of Object.keys(comments)) {
    const value = comments[key];

    // if it's a text node calculate word count and multiply with the reward value
    if (key == "#text") {
      if (!incentives.comment.totals.word) {
        continue;
      }
      const wordReward = new Decimal(incentives.comment.totals.word);
      const reward = wordReward.mul(value.map((str) => str.trim().split(" ").length).reduce((totalWords, wordCount) => totalWords + wordCount, 0));
      sum = sum.add(reward);
    } else {
      if (!incentives.comment.elements[key]) {
        continue;
      }
      const rewardValue = new Decimal(incentives.comment.elements[key]);
      const reward = rewardValue.mul(value.length);
      sum = sum.add(reward);
    }
  }

  return sum;
}
