import { Action, Handler } from "../types";
import { pricingLabelLogic } from "./pricing";
import { validatePriceLabels } from "./pricing/pre";
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
  [Action.SCHEDULE]: {
    pre: [nullHandler],
    action: [nullHandler],
    post: [nullHandler],
  }
};
