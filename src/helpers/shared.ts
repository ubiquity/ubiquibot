import ms from "ms";
import Runtime from "../bindings/bot-runtime";
import { LabelFromConfig, Payload, UserType } from "../types";

const contextNamesToSkip = ["workflow_run"];

export function shouldSkip() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;
  const response = { stop: false, reason: "" };

  if (contextNamesToSkip.includes(context.name)) {
    response.stop = true;
    response.reason = `excluded context name: ${context.name}`;
  } else if (payload.sender.type === UserType.Bot) {
    response.stop = true;
    response.reason = "sender is a bot";
  }

  return response;
}

export function calculateWeight(label?: LabelFromConfig): number {
  if (!label) return 0;
  const matches = label.name.match(/\d+/);
  const number = matches && matches.length > 0 ? parseInt(matches[0]) || 0 : 0;
  if (label.name.toLowerCase().includes("priority")) return number;
  if (label.name.toLowerCase().includes("minute")) return number * 0.002;
  if (label.name.toLowerCase().includes("hour")) return number * 0.125;
  if (label.name.toLowerCase().includes("day")) return 1 + (number - 1) * 0.25;
  if (label.name.toLowerCase().includes("week")) return number + 1;
  if (label.name.toLowerCase().includes("month")) return 5 + (number - 1) * 8;
  return 0;
}

export function calculateDuration(label: LabelFromConfig): number | null {
  const duration = label.name.split(":")[1];
  if (!duration) return null;
  return ms(duration) / 1000;
}
