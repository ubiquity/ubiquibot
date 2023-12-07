import { calculateLabelValue } from "../../helpers/shared";
import { Context } from "../../types/context";
import { Label } from "../../types/label";

export function calculateTaskPrice(
  context: Context,
  timeValue: number,
  priorityValue: number,
  baseValue?: number
): number {
  const base = baseValue ?? context.config.payments.basePriceMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = 1000 * base * timeValue * priority;
  return price;
}

export function setPrice(context: Context, timeLabel: Label, priorityLabel: Label) {
  const logger = context.logger;
  const { labels } = context.config;

  if (!timeLabel || !priorityLabel) throw logger.error("Time or priority label is not defined");

  const recognizedTimeLabels = labels.time.find((configLabel) => configLabel === timeLabel.name);
  if (!recognizedTimeLabels) throw logger.error("Time label is not recognized");

  const recognizedPriorityLabels = labels.priority.find((configLabel) => configLabel === priorityLabel.name);
  if (!recognizedPriorityLabels) throw logger.error("Priority label is not recognized");

  const timeValue = calculateLabelValue(recognizedTimeLabels);
  if (!timeValue) throw logger.error("Time value is not defined");

  const priorityValue = calculateLabelValue(recognizedPriorityLabels);
  if (!priorityValue) throw logger.error("Priority value is not defined");

  const taskPrice = calculateTaskPrice(context, timeValue, priorityValue);
  return `Price: ${taskPrice} USD`;
}
