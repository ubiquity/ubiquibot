import { GithubEvent, Handler, ActionHandler } from "../types";
import { closePullRequestForAnIssue, commentWithAssignMessage } from "./assign";
import { pricingLabelLogic, validatePriceLabels } from "./pricing";
import { checkBountiesToUnassign, collectAnalytics, checkWeeklyUpdate } from "./wildcard";
import { nullHandler } from "./shared";
import { handleComment, issueClosedCallback, issueCreatedCallback, issueReopenedCallback } from "./comment";
import { checkPullRequests } from "./assign/auto";
import { createDevPoolPR } from "./pull-request";
import { incentivizeComments, incentivizeCreatorComment, incentivizePullRequestReviews } from "./payout";
import { runOnPush, validateConfigChange } from "./push";
import { findDuplicateOne } from "./issue";

export const processors: Record<string, Handler> = {
  [GithubEvent.ISSUES_OPENED]: {
    pre: [nullHandler],
    action: [findDuplicateOne, issueCreatedCallback],
    post: [nullHandler],
  },
  [GithubEvent.ISSUES_REOPENED]: {
    pre: [nullHandler],
    action: [issueReopenedCallback],
    post: [nullHandler],
  },
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
  [GithubEvent.ISSUES_UNASSIGNED]: {
    pre: [nullHandler],
    action: [closePullRequestForAnIssue],
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
    action: [issueClosedCallback],
    post: [incentivizeCreatorComment, incentivizeComments, incentivizePullRequestReviews],
  },
  [GithubEvent.PULL_REQUEST_OPENED]: {
    pre: [nullHandler],
    action: [checkPullRequests],
    post: [nullHandler],
  },
  [GithubEvent.INSTALLATION_ADDED_EVENT]: {
    pre: [nullHandler],
    action: [createDevPoolPR],
    post: [nullHandler],
  },
  [GithubEvent.PUSH_EVENT]: {
    pre: [nullHandler],
    action: [validateConfigChange, runOnPush],
    post: [nullHandler],
  },
};

/**
 * @dev The handlers which will run on every event hooked
 */
export const wildcardProcessors: ActionHandler[] = [checkBountiesToUnassign, collectAnalytics, checkWeeklyUpdate];
