import { getBotContext } from "../../bindings";
import { addLabelToIssue, clearAllPriceLabelsOnIssue } from "../../helpers";
import { Payload, TimeLabelWeights, ProfitLabelWeights, TimeTargetLabels, ProfitTargetLabels } from "../../types";
import { calculateBountyPrice } from "./calculate";

const getTargetPriceLabel = (timeLabel: string | undefined, profitLabel: string | undefined): string | undefined => {
  let targetPriceLabel: string | undefined = undefined;
  if (!timeLabel && !profitLabel) return targetPriceLabel;
  if (!timeLabel) {
    targetPriceLabel = TimeTargetLabels[profitLabel!];
  } else if (!profitLabel) {
    targetPriceLabel = ProfitTargetLabels[timeLabel!];
  } else {
    const bountyPrice = calculateBountyPrice(TimeLabelWeights[timeLabel], ProfitLabelWeights[profitLabel]);
    targetPriceLabel = `Price: ${bountyPrice} USDC`;
  }

  return targetPriceLabel;
};

export const pricingLabelLogic = async (): Promise<void> => {
  const { payload: _payload, log } = getBotContext();
  const payload = _payload as Payload;
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

  const minTimeLabel = timeLabels.reduce((a, b) => (a.value < b.value ? a : b));
  const minProfitLabel = profitLabels.reduce((a, b) => (a.value < b.value ? a : b));

  const targetPriceLabel = getTargetPriceLabel(minTimeLabel.name, minProfitLabel.name);
  if (targetPriceLabel) {
    log.info({ labels, timeLabels, profitLabels, targetPriceLabel }, `Adding price label to issue`);
    await clearAllPriceLabelsOnIssue();
    await addLabelToIssue(targetPriceLabel);
  } else {
    log.info({ labels, timeLabels, profitLabels, targetPriceLabel }, `Skipping action...`);
  }
};
