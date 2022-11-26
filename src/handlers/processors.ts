import { Action, Handler } from "../types";
import { pricingLabelLogic } from "./price";
import { nullHandler } from "./shared";

export const processors: Record<string, Handler> = {
  [Action.LABELED]: {
    pre: [nullHandler],
    action: [pricingLabelLogic],
    post: [nullHandler],
  },
  [Action.UNLABELED]: {
    pre: [nullHandler],
    action: [pricingLabelLogic],
    post: [nullHandler],
  },
};
