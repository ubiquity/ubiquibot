import { GitHubEvent, Handler, WildCardHandler } from "../types";
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
 * all MUST receive `Context` as the only parameter TODO: type checking on this
 */

export const processors: Record<string, Handler> = {
  [GitHubEvent.ISSUES_OPENED]: {
    pre: [],
    action: [],
    post: [],
  },
  [GitHubEvent.ISSUES_REOPENED]: {
    pre: [],
    action: [issueReopened],
    post: [],
  },
  [GitHubEvent.ISSUES_LABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [],
    post: [pricingLabel],
  },
  [GitHubEvent.ISSUES_UNLABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [],
    post: [pricingLabel],
  },
  [GitHubEvent.ISSUES_ASSIGNED]: {
    pre: [],
    action: [startCommandHandler],
    post: [],
  },
  [GitHubEvent.ISSUES_UNASSIGNED]: {
    pre: [],
    action: [closePullRequestForAnIssue],
    post: [],
  },
  [GitHubEvent.ISSUE_COMMENT_CREATED]: {
    pre: [],
    action: [commentCreatedOrEdited],
    post: [],
  },
  [GitHubEvent.ISSUE_COMMENT_EDITED]: {
    pre: [],
    action: [commentCreatedOrEdited],
    post: [],
  },
  [GitHubEvent.ISSUES_CLOSED]: {
    pre: [],
    action: [issueClosed],
    post: [],
  },
  [GitHubEvent.PULL_REQUEST_OPENED]: {
    pre: [],
    action: [checkPullRequests],
    post: [],
  },
  [GitHubEvent.INSTALLATION_ADDED_EVENT]: {
    pre: [],
    action: [createDevPoolPR],
    post: [],
  },
  [GitHubEvent.PUSH_EVENT]: {
    pre: [validateConfigChange],
    action: [],
    post: [checkModifiedBaseRate],
  },
  [GitHubEvent.LABEL_EDITED]: {
    pre: [],
    action: [watchLabelChange],
    post: [],
  },
};

export const wildcardProcessors: WildCardHandler[] = [checkTasksToUnassign]; // The handlers which will run after every event
