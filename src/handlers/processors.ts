import { Action, Handler } from "../types";
import { pricingLabelLogic } from "./price";
import { validatePriceLabels } from "./price/pre";
import { nullHandler } from "./shared";

export const processors: Record<string, Handler> = {
  [Action.LABELED]: {
    pre: [validatePriceLabels],
    action: [pricingLabelLogic],
    post: [nullHandler],
  },
  [Action.UNLABELED]: {
    pre: [validatePriceLabels],
    action: [pricingLabelLogic],
    post: [nullHandler],
  },
};
