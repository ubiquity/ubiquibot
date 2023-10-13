import { LogReturn } from "../../adapters/supabase/helpers/tables/logs";
import Runtime from "../../bindings/bot-runtime";
import { clearAllPriceLabelsOnIssue } from "../../helpers";
import { Label, Payload } from "../../types";
import { handleLabelsAccess } from "../access";
import { setPrice } from "../shared";
import { isParentIssue, handleParentIssue, getMinLabel, handleTargetPriceLabel } from "./action";

export async function pricingLabel() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const config = Runtime.getState().botConfig;
  const logger = runtime.logger;
  const payload = context.payload as Payload;

  if (!payload.issue) throw logger.error("Issue is not defined");

  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);

  if (payload.issue.body && isParentIssue(payload.issue.body)) return await handleParentIssue(labels);

  if (!(await handleLabelsAccess()) && config.publicAccessControl.setLabel)
    return logger.warn("No access to set labels");

  const { assistivePricing } = config.mode;

  if (!labels) return logger.warn(`No labels to calculate price`);

  const recognizedTimeLabels: Label[] = labels.filter((label: Label) =>
    typeof label === "string" || typeof label === "object"
      ? config.price.timeLabels.some((item) => item.name === label.name)
      : false
  );

  const recognizedPriorityLabels: Label[] = labels.filter((label: Label) =>
    typeof label === "string" || typeof label === "object"
      ? config.price.priorityLabels.some((item) => item.name === label.name)
      : false
  );

  if (!recognizedTimeLabels.length) {
    logger.warn("No recognized time labels to calculate price");
    await clearAllPriceLabelsOnIssue();
  }
  if (!recognizedPriorityLabels.length) {
    logger.warn("No recognized priority labels to calculate price");
    await clearAllPriceLabelsOnIssue();
  }

  const minTimeLabel = getMinLabel(recognizedTimeLabels);
  const minPriorityLabel = getMinLabel(recognizedPriorityLabels);

  if (!minTimeLabel || !minPriorityLabel) return logger.warn("Time or priority label is not defined");

  const targetPriceLabel = setPrice(minTimeLabel, minPriorityLabel);

  if (targetPriceLabel instanceof LogReturn) {
    // this didn't successfully set the price, instead it returned information about why it didn't
    // because this is the first time i'm handling it this way, its possible im handling it incorrectly
    console.trace("possible im handling this incorrectly");
    return targetPriceLabel;
  }

  if (targetPriceLabel) {
    await handleTargetPriceLabel(targetPriceLabel, labelNames, assistivePricing);
  } else {
    await clearAllPriceLabelsOnIssue();
    logger.info(`Skipping action...`);
  }
  return logger.info(`Price label set to ${targetPriceLabel}`);
}
