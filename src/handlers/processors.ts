import { GithubEvent, Handler, ActionHandler, Payload } from "../types";
import { commentWithAssignMessage } from "./assign";
import { pricingLabelLogic, validatePriceLabels } from "./pricing";
import { checkBountiesToUnassign, collectAnalytics, checkWeeklyUpdate } from "./wildcard";
import { nullHandler } from "./shared";
import { handleComment } from "./comment";
import { handleIssueClosed } from "./payout";
import { checkPullRequests } from "./assign/auto";
import { addCommentToIssue } from "../helpers";
import { getBotContext } from "../bindings";

export const processors: Record<string, Handler> = {
  [GithubEvent.ISSUES_LABELED]: {
    pre: [validatePriceLabels],
    action: [pricingLabelLogic],
    post: [nullHandler],
  },
  [GithubEvent.ISSUES_UNLABELED]: {
    pre: [validatePriceLabels],
    action: [pricingLabelLogic],
    post: [nullHandler],
  },
  [GithubEvent.ISSUES_ASSIGNED]: {
    pre: [nullHandler],
    action: [commentWithAssignMessage],
    post: [nullHandler],
  },
  [GithubEvent.ISSUE_COMMENT_CREATED]: {
    pre: [nullHandler],
    action: [handleComment],
    post: [nullHandler],
  },
  [GithubEvent.ISSUE_COMMENT_EDITED]: {
    pre: [nullHandler],
    action: [handleComment],
    post: [nullHandler],
  },
  [GithubEvent.ISSUES_CLOSED]: {
    pre: [nullHandler],
    // Changed this because functions now returns string responses not void
    action: [
      async (): Promise<void> => {
        const { payload: _payload } = getBotContext();
        const issue = (_payload as Payload).issue;
        try {
          const comment = await handleIssueClosed();
          return await addCommentToIssue(comment!, issue!.number);
        } catch (err: any) {
          return await addCommentToIssue("Error: " + err.message, issue!.number);
        }
      },
    ],
    post: [nullHandler],
  },
  [GithubEvent.PULL_REQUEST_OPENED]: {
    pre: [nullHandler],
    action: [checkPullRequests],
    post: [nullHandler],
  },
};

/**
 * @dev The handlers which will run on every event hooked
 */
export const wildcardProcessors: ActionHandler[] = [checkBountiesToUnassign, collectAnalytics, checkWeeklyUpdate];
