import ms from "ms";
import Runtime from "../bindings/bot-runtime";
import { Label, LabelFromConfig, Payload, UserType } from "../types";

const contextNamesToSkip = ["workflow_run"];

export function shouldSkip() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const payload = context.payload as Payload;
  const response = { stop: false, reason: null } as { stop: boolean; reason: string | null };

  if (contextNamesToSkip.includes(context.name)) {
    response.stop = true;
    response.reason = `excluded context name: "${context.name}"`;
  } else if (payload.sender.type === UserType.Bot) {
    response.stop = true;
    response.reason = "sender is a bot";
  }

  return response;
}

export function calculateLabelValue(label: LabelFromConfig): number {
  const matches = label.name.match(/\d+/);
  const number = matches && matches.length > 0 ? parseInt(matches[0]) || 0 : 0;
  if (label.name.toLowerCase().includes("priority")) return number;
  // throw new Error(`Label ${label.name} is not a priority label`);
  if (label.name.toLowerCase().includes("minute")) return number * 0.002;
  if (label.name.toLowerCase().includes("hour")) return number * 0.125;
  if (label.name.toLowerCase().includes("day")) return 1 + (number - 1) * 0.25;
  if (label.name.toLowerCase().includes("week")) return number + 1;
  if (label.name.toLowerCase().includes("month")) return 5 + (number - 1) * 8;
  return 0;
}

export function calculateDurations(labels: Label[]): number[] {
  // from shortest to longest
  const durations: number[] = [];

  labels.forEach((label: Label) => {
    const matches = label.name.match(/<(\d+)\s*(\w+)/);
    if (matches && matches.length >= 3) {
      const number = parseInt(matches[1]);
      const unit = matches[2];
      const duration = ms(`${number} ${unit}`) / 1000;
      durations.push(duration);
    }
  });

  return durations.sort((a, b) => a - b);
}
