import { Action, Handler } from "../types";
import { commentWithAssignMessage } from "./assign";
import { pricingLabelLogic, validatePriceLabels } from "./pricing";
import { checkBountiesToUnassign, collectAnalytics } from "./schedule";
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
    action: [checkBountiesToUnassign, collectAnalytics],
    post: [nullHandler],
  },
  [Action.ASSIGNED]: {
    pre: [nullHandler],
    action: [commentWithAssignMessage],
    post: [nullHandler],
  },
};
