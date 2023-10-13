import { GithubEvent, Handler, ActionHandler } from "../types";
import { closePullRequestForAnIssue, startCommandHandler } from "./assign";
import { pricingLabel, syncPriceLabelsToConfig } from "./pricing";
import { checkTasksToUnassign } from "./wildcard";
// import { nullHandler } from "./shared";

import { checkPullRequests } from "./assign/auto";
import { createDevPoolPR } from "./pull-request";
import { runOnPush, validateConfigChange } from "./push";
import { findDuplicateIssue } from "./issue";
import { watchLabelChange } from "./label";
import { issueReopenedCallback } from "./comment/handlers/issue/issue-reopened-callback";
import { handleComment } from "./comment/action";
import { issueClosedCallback } from "./comment/handlers/issue/issue-closed-callback";

export const processors: Record<string, Handler> = {
  [GithubEvent.ISSUES_OPENED]: {
    pre: [],
    action: [findDuplicateIssue],
    post: [],
  },
  [GithubEvent.ISSUES_REOPENED]: {
    pre: [],
    action: [issueReopenedCallback],
    post: [],
  },
  [GithubEvent.ISSUES_LABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [pricingLabel],
    post: [],
  },
  [GithubEvent.ISSUES_UNLABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [pricingLabel],
    post: [],
  },
  [GithubEvent.ISSUES_ASSIGNED]: {
    pre: [],
    action: [startCommandHandler],
    post: [],
  },
  [GithubEvent.ISSUES_UNASSIGNED]: {
    pre: [],
    action: [closePullRequestForAnIssue],
    post: [],
  },
  [GithubEvent.ISSUE_COMMENT_CREATED]: {
    pre: [],
    action: [handleComment],
    post: [],
  },
  [GithubEvent.ISSUE_COMMENT_EDITED]: {
    pre: [],
    action: [handleComment],
    post: [],
  },
  [GithubEvent.ISSUES_CLOSED]: {
    pre: [],
    action: [issueClosedCallback],
    post: [],
  },
  [GithubEvent.PULL_REQUEST_OPENED]: {
    pre: [],
    action: [checkPullRequests],
    post: [],
  },
  [GithubEvent.INSTALLATION_ADDED_EVENT]: {
    pre: [],
    action: [createDevPoolPR],
    post: [],
  },
  [GithubEvent.PUSH_EVENT]: {
    pre: [],
    action: [validateConfigChange, runOnPush],
    post: [],
  },
  [GithubEvent.LABEL_EDITED]: {
    pre: [],
    action: [watchLabelChange],
    post: [],
  },
};

export const wildcardProcessors: ActionHandler[] = [checkTasksToUnassign]; // The handlers which will run after every event
