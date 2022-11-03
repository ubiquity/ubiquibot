import { Context } from "probot";
import { Payload } from "../interfaces/Payload";
import { RecognizedProfits, RecognizedTimes } from "../interfaces/Recognized";
import { addLabelToIssue } from "./addLabelToIssue";
import { calculateBountyPrice } from "./calculateBountyPrice";
import { clearAllPriceLabelsOnIssue } from "./clearAllPriceLabelsOnIssue";
import getLowestLabel from "./getLowest";

export async function callbackOnAny(context: Context) {
  const payload = context.payload as Payload;
  if (payload.sender.type == "Bot") return;
  if (context.name != "issues") return;
  if (payload.issue.number != 9) return;
  if (payload.action != "labeled" && payload.action != "unlabeled") return;

  const labels = payload.issue.labels;
  const issueTimes = labels.filter((label) => label.name.startsWith("Time:"));
  const issueProfits = labels.filter((label) => label.name.startsWith("Profit:"));

  if (!issueTimes.length && !issueProfits.length) return; // no labels

  const lowestTime = getLowestLabel(issueTimes, RecognizedTimes);
  const lowestProfit = getLowestLabel(issueProfits, RecognizedProfits);

  // no time estimate, only profit labels
  if (!lowestTime) {
    // this should estimate the price range based on the profit labels
    const range = {
      "Profit: <10%": "Price: 100-400 USDC",
      "Profit: <50%": "Price: 500-2000 USDC",
      "Profit: <100%": "Price: 1000-4000 USDC",
      "Profit: 100%+": "Price: 2000-8000 USDC",
      // @ts-ignore-error
    }[lowestProfit.key];

    await clearAllPriceLabelsOnIssue(context);
    await addLabelToIssue(context, range);
    return;
  }
  // no business impact estimate
  if (!lowestProfit) {
    // @ts-ignore-error
    const range = {
      "Time: <1 Day": "Price: 100-1000 USDC",
      "Time: <1 Week": "Price: 200-2000 USDC",
      "Time: <2 Weeks": "Price: 300-3000 USDC",
      "Time: <1 Month": "Price: 400-4000 USDC",
      "Time: 1 Month+": "Price: 500-5000 USDC",
      // @ts-ignore-error
    }[lowestTime.key];

    await clearAllPriceLabelsOnIssue(context);
    await addLabelToIssue(context, range);
    return;
  }

  const bountyPrice = calculateBountyPrice(lowestTime, lowestProfit);

  await clearAllPriceLabelsOnIssue(context);
  await addLabelToIssue(context, `Price: ${bountyPrice} USDC`);
  console.log(bountyPrice, `USDC`);
}
