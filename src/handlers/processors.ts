import Runtime from "../bindings/bot-runtime";
import { Handler, WildCardHandler } from "../types/handlers";
import { GitHubEvent } from "../types/payload";
import { closePullRequestForAnIssue, startCommandHandler } from "./assign/action";
import { checkPullRequests } from "./assign/auto";
import { commentCreatedOrEdited } from "./comment/action";
import { issueClosed } from "./comment/handlers/issue-closed";
import { watchLabelChange } from "./label/label";
import { syncPriceLabelsToConfig } from "./pricing/pre";
import { onLabelChangeSetPricing } from "./pricing/pricing-label";
import { createDevPoolPR } from "./pull-request/create-devpool-pr";
import { checkModifiedBaseRate } from "./push/check-modified-base-rate";
import { checkTasksToUnassign } from "./wildcard/unassign/check-tasks-to-unassign";

/**
 * @dev
 * pre and post handlers do not return a message to comment on the issue. their return type MUST BE `void`
 * main action MUST return a message to comment on the issue. its return type MUST BE either `string` for plaintext or `LogReturn` for color to signal success, warning, or failure status
 * TODO: all MUST receive `Context` as the only parameter
 */

export const processors: Record<string, Handler> = {
  [GitHubEvent.ISSUES_OPENED]: {
    pre: [],
    action: [],
    post: [],
  },
  [GitHubEvent.ISSUES_REOPENED]: {
    pre: [],
    action: [async () => Runtime.getState().logger.debug("TODO: replace ISSUES_REOPENED handler")],
    post: [],
  },
  [GitHubEvent.ISSUES_LABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [],
    post: [onLabelChangeSetPricing],
  },
  [GitHubEvent.ISSUES_UNLABELED]: {
    pre: [syncPriceLabelsToConfig],
    action: [],
    post: [onLabelChangeSetPricing],
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
    pre: [],
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
