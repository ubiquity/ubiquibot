import { getBotContext } from "../bindings";
import { LabelItem, Payload, UserType } from "../types";

const contextNamesToSkip = ["workflow_run"];

export const shouldSkip = (): { skip: boolean; reason: string } => {
  const context = getBotContext();
  const { name } = context;
  const payload = context.payload as Payload;
  const res: { skip: boolean; reason: string } = { skip: false, reason: "" };
  if (contextNamesToSkip.includes(name)) {
    res.skip = true;
    res.reason = `excluded context name: ${name}`;
  } else if (payload.sender.type === UserType.Bot) {
    res.skip = true;
    res.reason = "sender is a bot";
  }
  return res;
};

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const calculateWeight = (label: LabelItem | undefined): number => {
  if (!label) return 0;
  const matches = label.name.match(/\d+/);
  const number = matches && matches.length > 0 ? parseInt(matches[0]) : 0;
  if (label.name.split(":")[0] === "Priority") return number + 1;
  if (label.name.includes("Hour")) return number * 0.125;
  if (label.name.includes("Day")) return 1 + (number - 1) * 0.25;
  if (label.name.includes("Week")) return number + 1;
  if (label.name.includes("Month")) return 5 + (number - 1) * 8;
  return 0;
};
