import Runtime from "../../bindings/bot-runtime";
import { calculateLabelValue } from "../../helpers";

export function calculateTaskPrice(timeValue: number, priorityValue: number, baseValue?: number): number {
  const botConfig = Runtime.getState().botConfig;
  const base = baseValue ?? botConfig.price.baseMultiplier;
  const priority = priorityValue / 10; // floats cause bad math
  const price = 1000 * base * timeValue * priority;
  return price;
}

export function setPrice(timeLabel: string, priorityLabel: string) {
  const runtime = Runtime.getState();
  const botConfig = runtime.botConfig;
  const logger = runtime.logger;

  if (!timeLabel || !priorityLabel) throw logger.error("Time or priority label is not defined");

  const recognizedTimeLabels = botConfig.price.timeLabels.find((item) => item.name === timeLabel);
  if (!recognizedTimeLabels) throw logger.error("Time label is not recognized");

  const recognizedPriorityLabels = botConfig.price.priorityLabels.find((item) => item.name === priorityLabel);
  if (!recognizedPriorityLabels) throw logger.error("Priority label is not recognized");

  const timeValue = calculateLabelValue(recognizedTimeLabels);
  if (!timeValue) throw logger.error("Time value is not defined");

  const priorityValue = calculateLabelValue(recognizedPriorityLabels);
  if (!priorityValue) throw logger.error("Priority value is not defined");

  const taskPrice = calculateTaskPrice(timeValue, priorityValue);
  return `Price: ${taskPrice} USD`;
}
