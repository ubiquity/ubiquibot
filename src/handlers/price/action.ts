import { getBotConfig, getBotContext } from "../../bindings";
import { addLabelToIssue, clearAllPriceLabelsOnIssue } from "../../helpers";
import { Payload } from "../../types";
import { calculateBountyPrice } from "./calculate";

const getTargetPriceLabel = (timeLabel: string | undefined, profitLabel: string | undefined): string | undefined => {
  const botConfig = getBotConfig();
  let targetPriceLabel: string | undefined = undefined;
  if (!timeLabel && !profitLabel) return targetPriceLabel;
  if (!timeLabel) {
    targetPriceLabel = botConfig.price.profitLabels.find((item) => item.name === profitLabel)?.target;
  } else if (!profitLabel) {
    targetPriceLabel = botConfig.price.timeLabels.find((item) => item.name === timeLabel)?.target;
  } else {
    const timeWeight = botConfig.price.timeLabels.find((item) => item.name === timeLabel)!.weight;
    const profitWeight = botConfig.price.profitLabels.find((item) => item.name === profitLabel)!.weight;
    const bountyPrice = calculateBountyPrice(timeWeight, profitWeight);
    targetPriceLabel = `Price: ${bountyPrice} USDC`;
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
  const profitLabels = config.price.profitLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const minTimeLabel = timeLabels.length > 0 ? timeLabels.reduce((a, b) => (a.weight < b.weight ? a : b)).name : undefined;
  const minProfitLabel = profitLabels.length > 0 ? profitLabels.reduce((a, b) => (a.weight < b.weight ? a : b)).name : undefined;

  const targetPriceLabel = getTargetPriceLabel(minTimeLabel, minProfitLabel);
  if (targetPriceLabel) {
    if (labels.map(i => i.name).includes(targetPriceLabel)) {
      log.info({ labels, timeLabels, profitLabels, targetPriceLabel }, `Skipping... already exists`);

    } else {
      log.info({ labels, timeLabels, profitLabels, targetPriceLabel }, `Adding price label to issue`);
      await clearAllPriceLabelsOnIssue();
      await addLabelToIssue(targetPriceLabel);
    }
  } else {
    await clearAllPriceLabelsOnIssue();
    log.info({ labels, timeLabels, profitLabels, targetPriceLabel }, `Skipping action...`);
  }
};
