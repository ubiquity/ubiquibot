import Runtime from "../../bindings/bot-runtime";
import { clearAllPriceLabelsOnIssue } from "../../helpers";
import { Context, Label, LabelFromConfig, Payload } from "../../types";
import { handleLabelsAccess } from "../access";
import { isParentIssue, handleParentIssue, sortLabelsByValue, handleTargetPriceLabel } from "./action";
import { setPrice } from "../shared/pricing";

export async function pricingLabel(context: Context) {
  const runtime = Runtime.getState();
  const config = context.config;
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  if (!payload.issue) throw logger.error("Issue is not defined");

  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);

  if (payload.issue.body && isParentIssue(payload.issue.body)) return await handleParentIssue(context, labels);

  if (!(await handleLabelsAccess(context)) && config.publicAccessControl.setLabel)
    throw logger.warn("No access to set labels");

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
    await clearAllPriceLabelsOnIssue(context);
  }
  if (!recognizedPriorityLabels.length) {
    logger.warn("No recognized priority labels to calculate price");
    await clearAllPriceLabelsOnIssue(context);
  }

  const minTimeLabel = sortLabelsByValue(recognizedTimeLabels).shift();
  const minPriorityLabel = sortLabelsByValue(recognizedPriorityLabels).shift();

  if (!minTimeLabel) throw logger.warn(`No time label to calculate price`);
  if (!minPriorityLabel) throw logger.warn("No priority label to calculate price");

  const targetPriceLabel = setPrice(context, minTimeLabel, minPriorityLabel);

  if (targetPriceLabel) {
    await handleTargetPriceLabel(context, targetPriceLabel, labelNames, assistivePricing);
  } else {
    await clearAllPriceLabelsOnIssue(context);
    logger.info(`Skipping action...`);
  }
}
