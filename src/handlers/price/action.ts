import { getBotConfig, getBotContext } from "../../bindings";
import { addLabelToIssue, clearAllPriceLabelsOnIssue } from "../../helpers";
import { Payload } from "../../types";
import { calculateBountyPrice } from "./calculate";

const getTargetPriceLabel = (timeLabel: string | undefined, priorityLabel: string | undefined): string | undefined => {
  const botConfig = getBotConfig();
  let targetPriceLabel: string | undefined = undefined;
  if (!timeLabel && !priorityLabel) return targetPriceLabel;
  if (!timeLabel) {
    targetPriceLabel = botConfig.price.priorityLabels.find((item) => item.name === priorityLabel)?.target;
  } else if (!priorityLabel) {
    targetPriceLabel = botConfig.price.timeLabels.find((item) => item.name === timeLabel)?.target;
  } else {
    const timeWeight = botConfig.price.timeLabels.find((item) => item.name === timeLabel)!.weight;
    const priorityWeight = botConfig.price.priorityLabels.find((item) => item.name === priorityLabel)!.weight;
    const bountyPrice = calculateBountyPrice(timeWeight, priorityWeight);
    targetPriceLabel = `Price: ${bountyPrice} USD`;
  }

  return targetPriceLabel;
};

export const pricingLabelLogic = async (): Promise<void> => {
  const context = getBotContext();
  const config = getBotConfig();
  const { log } = context;
  const payload = context.payload as Payload;
  if (!payload.issue) return;
  const labels = payload.issue.labels;

  const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const minTimeLabel = timeLabels.length > 0 ? timeLabels.reduce((a, b) => (a.weight < b.weight ? a : b)).name : undefined;
  const minProfitLabel = priorityLabels.length > 0 ? priorityLabels.reduce((a, b) => (a.weight < b.weight ? a : b)).name : undefined;

  const targetPriceLabel = getTargetPriceLabel(minTimeLabel, minProfitLabel);
  if (targetPriceLabel) {
    if (labels.map((i) => i.name).includes(targetPriceLabel)) {
      log.info({ labels, timeLabels, priorityLabels, targetPriceLabel }, `Skipping... already exists`);
    } else {
      log.info({ labels, timeLabels, priorityLabels, targetPriceLabel }, `Adding price label to issue`);
      await clearAllPriceLabelsOnIssue();
      await addLabelToIssue(targetPriceLabel);
    }
  } else {
    await clearAllPriceLabelsOnIssue();
    log.info({ labels, timeLabels, priorityLabels, targetPriceLabel }, `Skipping action...`);
  }
};
