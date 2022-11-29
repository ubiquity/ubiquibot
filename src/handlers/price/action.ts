import { getBotContext } from "../../bindings";
import { addLabelToIssue, clearAllPriceLabelsOnIssue } from "../../helpers";
import { Payload, TimeLabelWeights, ProfitLabelWeights, TimeTargetLabels, ProfitTargetLabels } from "../../types";
import { calculateBountyPrice } from "./calculate";

const getTargetPriceLabel = (timeLabel: string | undefined, profitLabel: string | undefined): string | undefined => {
  let targetPriceLabel: string | undefined = undefined;
  if (!timeLabel && !profitLabel) return targetPriceLabel;
  if (!timeLabel) {
    targetPriceLabel = ProfitTargetLabels[profitLabel!];
  } else if (!profitLabel) {
    targetPriceLabel = TimeTargetLabels[timeLabel!];
  } else {
    const bountyPrice = calculateBountyPrice(TimeLabelWeights[timeLabel], ProfitLabelWeights[profitLabel]);
    targetPriceLabel = `Price: ${bountyPrice} USDC`;
  }

  return targetPriceLabel;
};

export const pricingLabelLogic = async (): Promise<void> => {
  const context = getBotContext();
  const { log } = context;
  const payload = context.payload as Payload;
  if (!payload.issue) return;
  const labels = payload.issue.labels;

  const timeLabels = labels
    .filter((label) => Object.keys(TimeLabelWeights).includes(label.name.toString()))
    .map((label) => {
      return { name: label.name, value: TimeLabelWeights[label.name] };
    });
  const profitLabels = labels
    .filter((label) => Object.keys(ProfitLabelWeights).includes(label.name.toString()))
    .map((label) => {
      return { name: label.name, value: ProfitLabelWeights[label.name] };
    });
  const minTimeLabel = timeLabels.length > 0 ? timeLabels.reduce((a, b) => (a.value < b.value ? a : b)).name : undefined;
  const minProfitLabel = profitLabels.length > 0 ? profitLabels.reduce((a, b) => (a.value < b.value ? a : b)).name : undefined;
  console.log("> minTimeLabel: ", minTimeLabel);
  console.log("> minProfitLabel: ", minProfitLabel);

  const targetPriceLabel = getTargetPriceLabel(minTimeLabel, minProfitLabel);
  if (targetPriceLabel) {
    log.info({ labels, timeLabels, profitLabels, targetPriceLabel }, `Adding price label to issue`);
    await clearAllPriceLabelsOnIssue();
    await addLabelToIssue(targetPriceLabel);
  } else {
    await clearAllPriceLabelsOnIssue();
    log.info({ labels, timeLabels, profitLabels, targetPriceLabel }, `Skipping action...`);
  }
};
