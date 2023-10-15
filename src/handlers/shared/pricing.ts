import Runtime from "../../bindings/bot-runtime";
import { calculateLabelValue } from "../../helpers";
import { Label } from "../../types/label";

export function calculateTaskPrice(timeValue: number, priorityValue: number, baseValue?: number): number {
  const runtime = Runtime.getState();
  const base = baseValue ?? runtime.botConfig.price.priceMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = 1000 * base * timeValue * priority;
  return price;
}

export function setPrice(timeLabel: Label, priorityLabel: Label) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  if (!timeLabel || !priorityLabel) throw logger.warn("Time or priority label is not defined");

  const recognizedTimeLabels = runtime.botConfig.price.timeLabels.find((item) => item.name === timeLabel.name);
  if (!recognizedTimeLabels) throw logger.warn("Time label is not recognized");

  const recognizedPriorityLabels = runtime.botConfig.price.priorityLabels.find(
    (item) => item.name === priorityLabel.name
  );
  if (!recognizedPriorityLabels) throw logger.warn("Priority label is not recognized");

  const timeValue = calculateLabelValue(recognizedTimeLabels);
  if (!timeValue) throw logger.warn("Time value is not defined");

  const priorityValue = calculateLabelValue(recognizedPriorityLabels);
  if (!priorityValue) throw logger.warn("Priority value is not defined");

  const taskPrice = calculateTaskPrice(timeValue, priorityValue);
  return `Price: ${taskPrice} USD`;
}
