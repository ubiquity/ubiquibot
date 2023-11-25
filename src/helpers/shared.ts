import ms from "ms";

import { Context as ProbotContext } from "probot";
import { Label } from "../types/label";
import { Payload, UserType } from "../types/payload";

const contextNamesToSkip = ["workflow_run"];

export function shouldSkip(context: ProbotContext) {
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

export function calculateLabelValue(label: string): number {
  const matches = label.match(/\d+/);
  const number = matches && matches.length > 0 ? parseInt(matches[0]) || 0 : 0;
  if (label.toLowerCase().includes("priority")) return number;
  // throw new Error(`Label ${label} is not a priority label`);
  if (label.toLowerCase().includes("minute")) return number * 0.002;
  if (label.toLowerCase().includes("hour")) return number * 0.125;
  if (label.toLowerCase().includes("day")) return 1 + (number - 1) * 0.25;
  if (label.toLowerCase().includes("week")) return number + 1;
  if (label.toLowerCase().includes("month")) return 5 + (number - 1) * 8;
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
