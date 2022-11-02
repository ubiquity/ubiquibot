import { Probot } from "probot";
import { getLowest } from "./utils/getLowest";
import { Label } from "./interfaces/Label";
import { Payload } from "./interfaces/Payload";
import { RecognizedProfits, RecognizedTimes } from "./interfaces/Recognized";
import { calculateBountyPrice } from "./utils/calculateBountyPrice";

module.exports = function main(app: Probot) {
  app.onAny(async function callbackOnAny(event: any) {
    const payload = event.payload as Payload;

    if (event.name != "issues") return;
    if (payload.issue.number != 9) return;
    if (payload.action != "labeled" && payload.action != "unlabeled") return;

    const labels = payload.issue.labels;

    const times = labels.filter((label) => label.name.startsWith("Time:"));
    const profits = labels.filter((label) => label.name.startsWith("Profit:"));

    const lowestTime = getLowest(times, RecognizedTimes);
    const lowestProfit = getLowest(profits, RecognizedProfits);

    const bountyPrice = calculateBountyPrice(lowestTime, lowestProfit);

    console.log(bountyPrice, `USDC`);
  });
};

export type LabelAndIndex = { lowest: Label; index: number };
