import { Probot } from "probot";
import { Payload } from "./interfaces/Payload";
import { RecognizedProfits, RecognizedTimes } from "./interfaces/Recognized";
import { calculateBountyPrice } from "./utils/calculateBountyPrice";
import getLowestLabel from "./utils/getLowest";

module.exports = function main(app: Probot) {
  app.onAny(callbackOnAny);
};

async function callbackOnAny(event: any) {
  const payload = event.payload as Payload;

  if (event.name != "issues") return;
  if (payload.issue.number != 9) return;
  if (payload.action != "labeled" && payload.action != "unlabeled") return;

  const labels = payload.issue.labels;
  const issueTimes = labels.filter((label) => label.name.startsWith("Time:"));
  const issueProfits = labels.filter((label) => label.name.startsWith("Profit:"));

  if (!issueTimes.length) {
    throw new Error(`No times found in issue labels ${JSON.stringify(labels.map((label) => label.name))}`);
  }
  if (!issueProfits.length) {
    throw new Error(`No profits found in issue labels ${JSON.stringify(labels.map((label) => label.name))}`);
  }

  const lowestTime = getLowestLabel(issueTimes, RecognizedTimes);
  const lowestProfit = getLowestLabel(issueProfits, RecognizedProfits);
  const bountyPrice = calculateBountyPrice(lowestTime, lowestProfit);

  console.log(bountyPrice, `USDC`);
}
