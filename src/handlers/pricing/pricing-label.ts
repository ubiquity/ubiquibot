import Runtime from "../../bindings/bot-runtime";
import { clearAllPriceLabelsOnIssue } from "../../helpers";
import { Label, LabelFromConfig, Payload } from "../../types";
import { labelAccessPermissionsCheck } from "../access";
import { isParentIssue, handleParentIssue, sortLabelsByValue, handleTargetPriceLabel } from "./action";
import { setPrice } from "../shared/pricing";

export async function onLabelChangeSetPricing() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const config = Runtime.getState().botConfig;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  if (!payload.issue) throw logger.error("Issue is not defined");

  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);

  if (payload.issue.body && isParentIssue(payload.issue.body)) {
    await handleParentIssue(labels);
    return;
  }
  const permission = await labelAccessPermissionsCheck();
  if (!permission) {
    if (config.publicAccessControl.setLabel === false) {
      throw logger.warn("No public access control to set labels");
    }
    throw logger.warn("No permission to set labels");
  }

  const { assistivePricing } = config.mode;
  // console.trace({ assistivePricing })

  if (!labels) throw logger.warn(`No labels to calculate price`);

  const isRecognizedLabel = (label: Label, labelConfig: LabelFromConfig[]) =>
    (typeof label === "string" || typeof label === "object") && labelConfig.some((item) => item.name === label.name);

  const recognizedTimeLabels: Label[] = labels.filter((label: Label) =>
    isRecognizedLabel(label, config.price.timeLabels)
  );

  const recognizedPriorityLabels: Label[] = labels.filter((label: Label) =>
    isRecognizedLabel(label, config.price.priorityLabels)
  );

  if (!recognizedTimeLabels.length) {
    logger.warn("No recognized time labels to calculate price");
    await clearAllPriceLabelsOnIssue();
  }
  if (!recognizedPriorityLabels.length) {
    logger.warn("No recognized priority labels to calculate price");
    await clearAllPriceLabelsOnIssue();
  }

  const minTimeLabel = sortLabelsByValue(recognizedTimeLabels).shift();
  const minPriorityLabel = sortLabelsByValue(recognizedPriorityLabels).shift();

  if (!minTimeLabel) {
    logger.warn(`No time label to calculate price`);
    return;
  }
  if (!minPriorityLabel) {
    logger.warn("No priority label to calculate price");
    return;
  }

  const targetPriceLabel = setPrice(minTimeLabel, minPriorityLabel);

  if (targetPriceLabel) {
    await handleTargetPriceLabel(targetPriceLabel, labelNames, assistivePricing);
  } else {
    await clearAllPriceLabelsOnIssue();
    logger.info(`Skipping action...`);
  }
}
