import Runtime from "../../bindings/bot-runtime";
import { calculateLabelValue } from "../../helpers";

export function calculateTaskPrice(timeValue: number, priorityValue: number, baseValue?: number): number {
  const runtime = Runtime.getState();
  const base = baseValue ?? runtime.botConfig.price.baseMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = 1000 * base * timeValue * priority;
  return price;
}

export function setPrice(timeLabel: string, priorityLabel: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;

  if (!timeLabel || !priorityLabel) return logger.warn("Time or priority label is not defined");

  const recognizedTimeLabels = runtime.botConfig.price.timeLabels.find((item) => item.name === timeLabel);
  if (!recognizedTimeLabels) return logger.warn("Time label is not recognized");

  const recognizedPriorityLabels = runtime.botConfig.price.priorityLabels.find((item) => item.name === priorityLabel);
  if (!recognizedPriorityLabels) return logger.warn("Priority label is not recognized");

  const timeValue = calculateLabelValue(recognizedTimeLabels);
  if (!timeValue) return logger.warn("Time value is not defined");

  const priorityValue = calculateLabelValue(recognizedPriorityLabels);
  if (!priorityValue) return logger.warn("Priority value is not defined");

  const taskPrice = calculateTaskPrice(timeValue, priorityValue);
  return `Price: ${taskPrice} USD`;
}
