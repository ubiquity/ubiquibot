import { GithubEvent, Handler, WildCardHandler } from "../types";
import { closePullRequestForAnIssue, startCommandHandler } from "./assign";
import { syncPriceLabelsToConfig } from "./pricing";
import { checkTasksToUnassign } from "./wildcard";

import { checkPullRequests } from "./assign/auto";
import { commentCreatedOrEdited } from "./comment/action";
import { issueClosed } from "./comment/handlers/issue/issue-closed";
import { watchLabelChange } from "./label";
import { createDevPoolPR } from "./pull-request";
import { validateConfigChange } from "./push";
import { checkModifiedBaseRate } from "./push/check-modified-base-rate";
import { pricingLabel } from "./pricing/pricing-label";
import { issueReopened } from "./comment/handlers/issue/issue-reopened";

/**
 * @dev
 * pre and post handlers do not return a message to comment on the issue. their return type MUST BE `void`
 * main action MUST return a message to comment on the issue. its return type MUST BE either `string` for plaintext or `LogReturn` for color to signal success, warning, or failure status
 */

export const processors: Record<string, Handler> = {
  [GithubEvent.ISSUES_OPENED]: {
    pre: [],
    action: [],
    post: [],
  },
  [GithubEvent.ISSUES_REOPENED]: {
    pre: [],
    action: [issueReopened],
    post: [],
  },
  [GithubEvent.ISSUES_LABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [],
    post: [pricingLabel],
  },
  [GithubEvent.ISSUES_UNLABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [],
    post: [pricingLabel],
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
    action: [commentCreatedOrEdited],
    post: [],
  },
  [GithubEvent.ISSUE_COMMENT_EDITED]: {
    pre: [],
    action: [commentCreatedOrEdited],
    post: [],
  },
  [GithubEvent.ISSUES_CLOSED]: {
    pre: [],
    action: [issueClosed],
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
    pre: [validateConfigChange],
    action: [],
    post: [checkModifiedBaseRate],
  },
  [GithubEvent.LABEL_EDITED]: {
    pre: [],
    action: [watchLabelChange],
    post: [],
  },
};

export const wildcardProcessors: WildCardHandler[] = [checkTasksToUnassign]; // The handlers which will run after every event
