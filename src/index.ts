import { Probot } from "probot";
import getLowestLabel from "./utils/getLowest";
import { Label } from "./interfaces/Label";
import { Payload } from "./interfaces/Payload";
import { calculateBountyPrice } from "./utils/calculateBountyPrice";
import { RecognizedProfits, RecognizedTimes } from "./interfaces/Recognized";

module.exports = function main(app: Probot) {
  app.onAny(async function callbackOnAny(event: any) {
    const payload = event.payload as Payload;

    if (event.name != "issues") return;
    if (payload.issue.number != 9) return;
    if (payload.action != "labeled" && payload.action != "unlabeled") return;

    const labels = payload.issue.labels;

    const issueTimes = labels.filter((label) => label.name.startsWith("Time:"));
    const issueProfits = labels.filter((label) => label.name.startsWith("Profit:"));

    // console.log({ issueTimes, issueProfits });
    // console.log({ issueProfits, RecognizedProfits });

    const lowestTime = getLowestLabel(issueTimes, RecognizedTimes);
    const lowestProfit = getLowestLabel(issueProfits, RecognizedProfits);

    console.log({ lowestTime, lowestProfit });

    const bountyPrice = calculateBountyPrice(lowestTime, lowestProfit);

    console.log(bountyPrice, `USDC`);
  });
};

export type LabelAndIndex = { lowest: Label; index: number };
