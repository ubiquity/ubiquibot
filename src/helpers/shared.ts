import { getBotContext } from "../bindings";
import { Payload, UserType } from "../types";

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
