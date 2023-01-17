import { Action, Handler, ActionHandler } from "../types";
import { commentWithAssignMessage } from "./assign";
import { pricingLabelLogic, validatePriceLabels } from "./pricing";
import { checkBountiesToUnassign, collectAnalytics } from "./wildcard";
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
  [Action.ASSIGNED]: {
    pre: [nullHandler],
    action: [commentWithAssignMessage],
    post: [nullHandler],
  },
};

/**
 * @dev The handlers which will run on every event hooked
 */
export const wildcardProcessors: ActionHandler[] = [checkBountiesToUnassign, collectAnalytics];
