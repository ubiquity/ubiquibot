// https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads

import { Static, Type } from "@sinclair/typebox";
import { labelSchema } from "./label";

export enum GitHubEvent {
  "BRANCH_PROTECTION_RULE" = "branch_protection_rule",
  "BRANCH_PROTECTION_RULE_CREATED" = "branch_protection_rule.created",
  "BRANCH_PROTECTION_RULE_DELETED" = "branch_protection_rule.deleted",
  "BRANCH_PROTECTION_RULE_EDITED" = "branch_protection_rule.edited",
  "CHECK_RUN" = "check_run",
  "CHECK_RUN_COMPLETED" = "check_run.completed",
  "CHECK_RUN_CREATED" = "check_run.created",
  "CHECK_RUN_REQUESTED_ACTION" = "check_run.requested_action",
  "CHECK_RUN_REREQUESTED" = "check_run.rerequested",
  "CHECK_SUITE" = "check_suite",
  "CHECK_SUITE_COMPLETED" = "check_suite.completed",
  "CHECK_SUITE_REQUESTED" = "check_suite.requested",
  "CHECK_SUITE_REREQUESTED" = "check_suite.rerequested",
  "CODE_SCANNING_ALERT" = "code_scanning_alert",
  "CODE_SCANNING_ALERT_APPEARED_IN_BRANCH" = "code_scanning_alert.appeared_in_branch",
  "CODE_SCANNING_ALERT_CLOSED_BY_USER" = "code_scanning_alert.closed_by_user",
  "CODE_SCANNING_ALERT_CREATED" = "code_scanning_alert.created",
  "CODE_SCANNING_ALERT_FIXED" = "code_scanning_alert.fixed",
  "CODE_SCANNING_ALERT_REOPENED" = "code_scanning_alert.reopened",
  "CODE_SCANNING_ALERT_REOPENED_BY_USER" = "code_scanning_alert.reopened_by_user",
  "COMMIT_COMMENT" = "commit_comment",
  "COMMIT_COMMENT_CREATED" = "commit_comment.created",
  "CREATE" = "create",
  "DELETE" = "delete",
  "DEPLOY_KEY" = "deploy_key",
  "DEPLOY_KEY_CREATED" = "deploy_key.created",
  "DEPLOY_KEY_DELETED" = "deploy_key.deleted",
  "DEPLOYMENT" = "deployment",
  "DEPLOYMENT_CREATED" = "deployment.created",
  "DEPLOYMENT_STATUS" = "deployment_status",
  "DEPLOYMENT_STATUS_CREATED" = "deployment_status.created",
  "DISCUSSION" = "discussion",
  "DISCUSSION_ANSWERED" = "discussion.answered",
  "DISCUSSION_CATEGORY_CHANGED" = "discussion.category_changed",
  "DISCUSSION_CREATED" = "discussion.created",
  "DISCUSSION_DELETED" = "discussion.deleted",
  "DISCUSSION_EDITED" = "discussion.edited",
  "DISCUSSION_LABELED" = "discussion.labeled",
  "DISCUSSION_LOCKED" = "discussion.locked",
  "DISCUSSION_PINNED" = "discussion.pinned",
  "DISCUSSION_TRANSFERRED" = "discussion.transferred",
  "DISCUSSION_UNANSWERED" = "discussion.unanswered",
  "DISCUSSION_UNLABELED" = "discussion.unlabeled",
  "DISCUSSION_UNLOCKED" = "discussion.unlocked",
  "DISCUSSION_UNPINNED" = "discussion.unpinned",
  "DISCUSSION_COMMENT" = "discussion_comment",
  "DISCUSSION_COMMENT_CREATED" = "discussion_comment.created",
  "DISCUSSION_COMMENT_DELETED" = "discussion_comment.deleted",
  "DISCUSSION_COMMENT_EDITED" = "discussion_comment.edited",
  "FORK" = "fork",
  "GITHUB_APP_AUTHORIZATION" = "github_app_authorization",
  "GITHUB_APP_AUTHORIZATION_REVOKED" = "github_app_authorization.revoked",
  "GOLLUM" = "gollum",
  "INSTALLATION" = "installation",
  "INSTALLATION_CREATED" = "installation.created",
  "INSTALLATION_DELETED" = "installation.deleted",
  "INSTALLATION_NEW_PERMISSIONS_ACCEPTED" = "installation.new_permissions_accepted",
  "INSTALLATION_SUSPEND" = "installation.suspend",
  "INSTALLATION_UNSUSPEND" = "installation.unsuspend",
  "INSTALLATION_REPOSITORIES" = "installation_repositories",
  "INSTALLATION_REPOSITORIES_ADDED" = "installation_repositories.added",
  "INSTALLATION_REPOSITORIES_REMOVED" = "installation_repositories.removed",
  "ISSUE_COMMENT" = "issue_comment",
  "ISSUE_COMMENT_CREATED" = "issue_comment.created",
  "ISSUE_COMMENT_DELETED" = "issue_comment.deleted",
  "ISSUE_COMMENT_EDITED" = "issue_comment.edited",
  "ISSUES" = "issues",
  "ISSUES_ASSIGNED" = "issues.assigned",
  "ISSUES_CLOSED" = "issues.closed",
  "ISSUES_DELETED" = "issues.deleted",
  "ISSUES_DEMILESTONED" = "issues.demilestoned",
  "ISSUES_EDITED" = "issues.edited",
  "ISSUES_LABELED" = "issues.labeled",
  "ISSUES_LOCKED" = "issues.locked",
  "ISSUES_MILESTONED" = "issues.milestoned",
  "ISSUES_OPENED" = "issues.opened",
  "ISSUES_PINNED" = "issues.pinned",
  "ISSUES_REOPENED" = "issues.reopened",
  "ISSUES_TRANSFERRED" = "issues.transferred",
  "ISSUES_UNASSIGNED" = "issues.unassigned",
  "ISSUES_UNLABELED" = "issues.unlabeled",
  "ISSUES_UNLOCKED" = "issues.unlocked",
  "ISSUES_UNPINNED" = "issues.unpinned",
  "LABEL" = "label",
  "LABEL_CREATED" = "label.created",
  "LABEL_DELETED" = "label.deleted",
  "LABEL_EDITED" = "label.edited",
  "MARKETPLACE_PURCHASE" = "marketplace_purchase",
  "MARKETPLACE_PURCHASE_CANCELLED" = "marketplace_purchase.cancelled",
  "MARKETPLACE_PURCHASE_CHANGED" = "marketplace_purchase.changed",
  "MARKETPLACE_PURCHASE_PENDING_CHANGE" = "marketplace_purchase.pending_change",
  "MARKETPLACE_PURCHASE_PENDING_CHANGE_CANCELLED" = "marketplace_purchase.pending_change_cancelled",
  "MARKETPLACE_PURCHASE_PURCHASED" = "marketplace_purchase.purchased",
  "MEMBER" = "member",
  "MEMBER_ADDED" = "member.added",
  "MEMBER_EDITED" = "member.edited",
  "MEMBER_REMOVED" = "member.removed",
  "MEMBERSHIP" = "membership",
  "MEMBERSHIP_ADDED" = "membership.added",
  "MEMBERSHIP_REMOVED" = "membership.removed",
  "META" = "meta",
  "META_DELETED" = "meta.deleted",
  "MILESTONE" = "milestone",
  "MILESTONE_CLOSED" = "milestone.closed",
  "MILESTONE_CREATED" = "milestone.created",
  "MILESTONE_DELETED" = "milestone.deleted",
  "MILESTONE_EDITED" = "milestone.edited",
  "MILESTONE_OPENED" = "milestone.opened",
  "ORG_BLOCK" = "org_block",
  "ORG_BLOCK_BLOCKED" = "org_block.blocked",
  "ORG_BLOCK_UNBLOCKED" = "org_block.unblocked",
  "ORGANIZATION" = "organization",
  "ORGANIZATION_DELETED" = "organization.deleted",
  "ORGANIZATION_MEMBER_ADDED" = "organization.member_added",
  "ORGANIZATION_MEMBER_INVITED" = "organization.member_invited",
  "ORGANIZATION_MEMBER_REMOVED" = "organization.member_removed",
  "ORGANIZATION_RENAMED" = "organization.renamed",
  "PACKAGE" = "package",
  "PACKAGE_PUBLISHED" = "package.published",
  "PACKAGE_UPDATED" = "package.updated",
  "PAGE_BUILD" = "page_build",
  "PING" = "ping",
  "PROJECT" = "project",
  "PROJECT_CLOSED" = "project.closed",
  "PROJECT_CREATED" = "project.created",
  "PROJECT_DELETED" = "project.deleted",
  "PROJECT_EDITED" = "project.edited",
  "PROJECT_REOPENED" = "project.reopened",
  "PROJECT_CARD" = "project_card",
  "PROJECT_CARD_CONVERTED" = "project_card.converted",
  "PROJECT_CARD_CREATED" = "project_card.created",
  "PROJECT_CARD_DELETED" = "project_card.deleted",
  "PROJECT_CARD_EDITED" = "project_card.edited",
  "PROJECT_CARD_MOVED" = "project_card.moved",
  "PROJECT_COLUMN" = "project_column",
  "PROJECT_COLUMN_CREATED" = "project_column.created",
  "PROJECT_COLUMN_DELETED" = "project_column.deleted",
  "PROJECT_COLUMN_EDITED" = "project_column.edited",
  "PROJECT_COLUMN_MOVED" = "project_column.moved",
  "PROJECTS_V2_ITEM" = "projects_v2_item",
  "PROJECTS_V2_ITEM_ARCHIVED" = "projects_v2_item.archived",
  "PROJECTS_V2_ITEM_CONVERTED" = "projects_v2_item.converted",
  "PROJECTS_V2_ITEM_CREATED" = "projects_v2_item.created",
  "PROJECTS_V2_ITEM_DELETED" = "projects_v2_item.deleted",
  "PROJECTS_V2_ITEM_EDITED" = "projects_v2_item.edited",
  "PROJECTS_V2_ITEM_REORDERED" = "projects_v2_item.reordered",
  "PROJECTS_V2_ITEM_RESTORED" = "projects_v2_item.restored",
  "PUBLIC" = "public",
  "PULL_REQUEST" = "pull_request",
  "PULL_REQUEST_ASSIGNED" = "pull_request.assigned",
  "PULL_REQUEST_AUTO_MERGE_DISABLED" = "pull_request.auto_merge_disabled",
  "PULL_REQUEST_AUTO_MERGE_ENABLED" = "pull_request.auto_merge_enabled",
  "PULL_REQUEST_CLOSED" = "pull_request.closed",
  "PULL_REQUEST_CONVERTED_TO_DRAFT" = "pull_request.converted_to_draft",
  "PULL_REQUEST_EDITED" = "pull_request.edited",
  "PULL_REQUEST_LABELED" = "pull_request.labeled",
  "PULL_REQUEST_LOCKED" = "pull_request.locked",
  "PULL_REQUEST_OPENED" = "pull_request.opened",
  "PULL_REQUEST_READY_FOR_REVIEW" = "pull_request.ready_for_review",
  "PULL_REQUEST_REOPENED" = "pull_request.reopened",
  "PULL_REQUEST_REVIEW_REQUEST_REMOVED" = "pull_request.review_request_removed",
  "PULL_REQUEST_REVIEW_REQUESTED" = "pull_request.review_requested",
  "PULL_REQUEST_SYNCHRONIZE" = "pull_request.synchronize",
  "PULL_REQUEST_UNASSIGNED" = "pull_request.unassigned",
  "PULL_REQUEST_UNLABELED" = "pull_request.unlabeled",
  "PULL_REQUEST_UNLOCKED" = "pull_request.unlocked",
  "PULL_REQUEST_REVIEW" = "pull_request_review",
  "PULL_REQUEST_REVIEW_DISMISSED" = "pull_request_review.dismissed",
  "PULL_REQUEST_REVIEW_EDITED" = "pull_request_review.edited",
  "PULL_REQUEST_REVIEW_SUBMITTED" = "pull_request_review.submitted",
  "PULL_REQUEST_REVIEW_COMMENT" = "pull_request_review_comment",
  "PULL_REQUEST_REVIEW_COMMENT_CREATED" = "pull_request_review_comment.created",
  "PULL_REQUEST_REVIEW_COMMENT_DELETED" = "pull_request_review_comment.deleted",
  "PULL_REQUEST_REVIEW_COMMENT_EDITED" = "pull_request_review_comment.edited",
  "PULL_REQUEST_REVIEW_THREAD" = "pull_request_review_thread",
  "PULL_REQUEST_REVIEW_THREAD_RESOLVED" = "pull_request_review_thread.resolved",
  "PULL_REQUEST_REVIEW_THREAD_UNRESOLVED" = "pull_request_review_thread.unresolved",
  "PUSH" = "push",
  "RELEASE" = "release",
  "RELEASE_CREATED" = "release.created",
  "RELEASE_DELETED" = "release.deleted",
  "RELEASE_EDITED" = "release.edited",
  "RELEASE_PRERELEASED" = "release.prereleased",
  "RELEASE_PUBLISHED" = "release.published",
  "RELEASE_RELEASED" = "release.released",
  "RELEASE_UNPUBLISHED" = "release.unpublished",
  "REPOSITORY" = "repository",
  "REPOSITORY_ARCHIVED" = "repository.archived",
  "REPOSITORY_CREATED" = "repository.created",
  "REPOSITORY_DELETED" = "repository.deleted",
  "REPOSITORY_EDITED" = "repository.edited",
  "REPOSITORY_PRIVATIZED" = "repository.privatized",
  "REPOSITORY_PUBLICIZED" = "repository.publicized",
  "REPOSITORY_RENAMED" = "repository.renamed",
  "REPOSITORY_TRANSFERRED" = "repository.transferred",
  "REPOSITORY_UNARCHIVED" = "repository.unarchived",
  "REPOSITORY_DISPATCH" = "repository_dispatch",
  "REPOSITORY_IMPORT" = "repository_import",
  "REPOSITORY_VULNERABILITY_ALERT" = "repository_vulnerability_alert",
  "REPOSITORY_VULNERABILITY_ALERT_CREATE" = "repository_vulnerability_alert.create",
  "REPOSITORY_VULNERABILITY_ALERT_DISMISS" = "repository_vulnerability_alert.dismiss",
  "REPOSITORY_VULNERABILITY_ALERT_REOPEN" = "repository_vulnerability_alert.reopen",
  "REPOSITORY_VULNERABILITY_ALERT_RESOLVE" = "repository_vulnerability_alert.resolve",
  "SECRET_SCANNING_ALERT" = "secret_scanning_alert",
  "SECRET_SCANNING_ALERT_CREATED" = "secret_scanning_alert.created",
  "SECRET_SCANNING_ALERT_REOPENED" = "secret_scanning_alert.reopened",
  "SECRET_SCANNING_ALERT_RESOLVED" = "secret_scanning_alert.resolved",
  "SECURITY_ADVISORY" = "security_advisory",
  "SECURITY_ADVISORY_PERFORMED" = "security_advisory.performed",
  "SECURITY_ADVISORY_PUBLISHED" = "security_advisory.published",
  "SECURITY_ADVISORY_UPDATED" = "security_advisory.updated",
  "SECURITY_ADVISORY_WITHDRAWN" = "security_advisory.withdrawn",
  "SPONSORSHIP" = "sponsorship",
  "SPONSORSHIP_CANCELLED" = "sponsorship.cancelled",
  "SPONSORSHIP_CREATED" = "sponsorship.created",
  "SPONSORSHIP_EDITED" = "sponsorship.edited",
  "SPONSORSHIP_PENDING_CANCELLATION" = "sponsorship.pending_cancellation",
  "SPONSORSHIP_PENDING_TIER_CHANGE" = "sponsorship.pending_tier_change",
  "SPONSORSHIP_TIER_CHANGED" = "sponsorship.tier_changed",
  "STAR" = "star",
  "STAR_CREATED" = "star.created",
  "STAR_DELETED" = "star.deleted",
  "STATUS" = "status",
  "TEAM" = "team",
  "TEAM_ADDED_TO_REPOSITORY" = "team.added_to_repository",
  "TEAM_CREATED" = "team.created",
  "TEAM_DELETED" = "team.deleted",
  "TEAM_EDITED" = "team.edited",
  "TEAM_REMOVED_FROM_REPOSITORY" = "team.removed_from_repository",
  "TEAM_ADD" = "team_add",
  "WATCH" = "watch",
  "WATCH_STARTED" = "watch.started",
  "WORKFLOW_DISPATCH" = "workflow_dispatch",
  "WORKFLOW_JOB" = "workflow_job",
  "WORKFLOW_JOB_COMPLETED" = "workflow_job.completed",
  "WORKFLOW_JOB_IN_PROGRESS" = "workflow_job.in_progress",
  "WORKFLOW_JOB_QUEUED" = "workflow_job.queued",
  "WORKFLOW_RUN" = "workflow_run",
  "WORKFLOW_RUN_COMPLETED" = "workflow_run.completed",
  "WORKFLOW_RUN_REQUESTED" = "workflow_run.requested",
}

export enum UserType {
  User = "User",
  Bot = "Bot",
  Organization = "Organization",
}

export enum IssueType {
  OPEN = "open",
  CLOSED = "closed",
  // ALL = "all",
}

export enum StateReason {
  COMPLETED = "completed",
  NOT_PLANNED = "not_planned", // these are all used at runtime, not necessarily in the code.
  REOPENED = "reopened",
}

const userSchema = Type.Object({
  login: Type.String(),
  id: Type.Number(),
  node_id: Type.String(),
  avatar_url: Type.String(),
  gravatar_id: Type.Union([Type.Null(), Type.String()]),
  url: Type.String(),
  html_url: Type.String(),
  followers_url: Type.String(),
  following_url: Type.String(),
  gists_url: Type.String(),
  starred_url: Type.String(),
  subscriptions_url: Type.String(),
  organizations_url: Type.String(),
  repos_url: Type.String(),
  events_url: Type.String(),
  received_events_url: Type.String(),
  type: Type.Enum(UserType),
  site_admin: Type.Boolean(),
});

// const UserProfileSchema = Type.Intersect([
//   UserSchema,
//   Type.Object({
//     name: Type.String(),
//     company: Type.String(),
//     blog: Type.String(),
//     location: Type.String(),
//     email: Type.String(),
//     hireable: Type.Boolean(),
//     bio: Type.String(),
//     twitter_username: Type.String(),
//     public_repos: Type.Number(),
//     public_gists: Type.Number(),
//     followers: Type.Number(),
//     following: Type.Number(),
//     created_at: Type.String(),
//     updated_at: Type.String(),
//   }),
// ]);

export type GitHubUser = Static<typeof userSchema>;
// type UserProfile= Static<typeof UserProfileSchema>;
export enum AuthorAssociation {
  OWNER = "OWNER",
  COLLABORATOR = "COLLABORATOR",
  MEMBER = "MEMBER",
  CONTRIBUTOR = "CONTRIBUTOR",
  FIRST_TIMER = "FIRST_TIMER",
  FIRST_TIME_CONTRIBUTOR = "FIRST_TIME_CONTRIBUTOR",
  NONE = "NONE",
}
// const AuthorAssociation = Type.Enum(_AuthorAssociation);

const issueSchema = Type.Object({
  assignee: Type.Union([Type.Null(), userSchema]),
  assignees: Type.Array(Type.Union([Type.Null(), userSchema])),
  author_association: Type.Enum(AuthorAssociation),
  body: Type.String(),
  closed_at: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  comments_url: Type.String(),
  comments: Type.Number(),
  created_at: Type.String({ format: "date-time" }),
  events_url: Type.String(),
  html_url: Type.String(),
  id: Type.Number(),
  labels_url: Type.String(),
  labels: Type.Array(labelSchema),
  locked: Type.Boolean(),
  node_id: Type.String(),
  number: Type.Number(),
  repository_url: Type.String(),
  state_reason: Type.Union([Type.Enum(StateReason), Type.Null()]),
  state: Type.Enum(IssueType),
  title: Type.String(),
  updated_at: Type.String({ format: "date-time" }),
  url: Type.String(),
  user: userSchema,
  // OWNER: The author is an owner of the repository.
  // COLLABORATOR: The author is a collaborator on the repository.
  // MEMBER: The author is a member of the organization that owns the repository.
  // CONTRIBUTOR: The author has contributed to the repository but is not a collaborator, member, or owner.
  // FIRST_TIMER: The author is a first-time contributor to the repository.
  // FIRST_TIME_CONTRIBUTOR: Similar to "FIRST_TIMER," the author is a first-time contributor to the repository.
  // NONE: The author does not have any specific association with the repository.
});

export type GitHubIssue = Static<typeof issueSchema>;

const repositorySchema = Type.Object({
  allow_forking: Type.Boolean(),
  archive_url: Type.String(),
  archived: Type.Boolean(),
  assignees_url: Type.String(),
  blobs_url: Type.String(),
  branches_url: Type.String(),
  clone_url: Type.String(),
  collaborators_url: Type.String(),
  comments_url: Type.String(),
  commits_url: Type.String(),
  compare_url: Type.String(),
  contents_url: Type.String(),
  contributors_url: Type.String(),
  created_at: Type.String({ format: "date-time" }),
  default_branch: Type.String(),
  deployments_url: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  disabled: Type.Boolean(),
  downloads_url: Type.String(),
  events_url: Type.String(),
  fork: Type.Boolean(),
  forks_count: Type.Number(),
  forks_url: Type.String(),
  forks: Type.Number(),
  full_name: Type.String(),
  git_commits_url: Type.String(),
  git_refs_url: Type.String(),
  git_tags_url: Type.String(),
  git_url: Type.String(),
  has_downloads: Type.Boolean(),
  has_issues: Type.Boolean(),
  has_pages: Type.Boolean(),
  has_projects: Type.Boolean(),
  has_wiki: Type.Boolean(),
  hooks_url: Type.String(),
  html_url: Type.String(),
  id: Type.Number(),
  is_template: Type.Boolean(),
  issue_comment_url: Type.String(),
  issue_events_url: Type.String(),
  issues_url: Type.String(),
  keys_url: Type.String(),
  labels_url: Type.String(),
  language: Type.Any(),
  languages_url: Type.String(),
  license: Type.Any(),
  merges_url: Type.String(),
  milestones_url: Type.String(),
  name: Type.String(),
  node_id: Type.String(),
  notifications_url: Type.String(),
  open_issues_count: Type.Number(),
  open_issues: Type.Number(),
  owner: userSchema,
  private: Type.Boolean(),
  pulls_url: Type.String(),
  pushed_at: Type.String({ format: "date-time" }),
  releases_url: Type.String(),
  size: Type.Number(),
  ssh_url: Type.String(),
  stargazers_count: Type.Number(),
  stargazers_url: Type.String(),
  statuses_url: Type.String(),
  subscribers_url: Type.String(),
  subscription_url: Type.String(),
  svn_url: Type.String(),
  tags_url: Type.String(),
  teams_url: Type.String(),
  topics: Type.Array(Type.Any()),
  trees_url: Type.String(),
  updated_at: Type.String({ format: "date-time" }),
  url: Type.String(),
  visibility: Type.String(),
  watchers_count: Type.Number(),
  watchers: Type.Number(),
  web_commit_signoff_required: Type.Boolean(),
});

export type GitHubRepository = Static<typeof repositorySchema>;

const organizationSchema = Type.Object({
  login: Type.String(),
  id: Type.Number(),
  node_id: Type.String(),
  url: Type.String(),
  repos_url: Type.String(),
  events_url: Type.String(),
  hooks_url: Type.String(),
  issues_url: Type.String(),
  members_url: Type.String(),
  public_members_url: Type.String(),
  avatar_url: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
});

const commitsSchema = Type.Object({
  id: Type.String(),
  distinct: Type.Boolean(),
  added: Type.Array(Type.String()),
  removed: Type.Array(Type.String()),
  modified: Type.Array(Type.String()),
});

export type GitHubCommitsPayload = Static<typeof commitsSchema>;

const installationSchema = Type.Object({
  id: Type.Number(),
  node_id: Type.String(),
});

const commentSchema = Type.Object({
  author_association: Type.String(),
  body_html: Type.Optional(Type.String()),
  body_text: Type.Optional(Type.String()),
  body: Type.String(),
  created_at: Type.String({ format: "date-time" }),
  html_url: Type.String(),
  id: Type.Number(),
  issue_url: Type.String(),
  node_id: Type.String(),
  updated_at: Type.String({ format: "date-time" }),
  url: Type.String(),
  user: userSchema,
  reactions: Type.Object({
    url: Type.String(),
    total_count: Type.Number(),
    "+1": Type.Number(),
    "-1": Type.Number(),
    laugh: Type.Number(),
    hooray: Type.Number(),
    confused: Type.Number(),
    heart: Type.Number(),
    rocket: Type.Number(),
    eyes: Type.Number(),
  }),
  // performed_via_github_app: Type.Optional(Type.Boolean()),
});

export type GitHubComment = Static<typeof commentSchema>;

const assignEventSchema = Type.Object({
  url: Type.String(),
  id: Type.Number(),
  node_id: Type.String(),
  event: Type.String(),
  commit_id: Type.String(),
  commit_url: Type.String(),
  created_at: Type.String({ format: "date-time" }),
  actor: userSchema,
  assignee: userSchema,
  assigner: userSchema,
});

export type GitHubAssignEvent = Static<typeof assignEventSchema>;

const changesSchema = Type.Object({
  body: Type.Optional(
    Type.Object({
      from: Type.String(),
    })
  ),
  name: Type.Optional(
    Type.Object({
      from: Type.String(),
    })
  ),
});

export const payloadSchema = Type.Object({
  action: Type.String(),
  issue: Type.Optional(issueSchema),
  label: Type.Optional(labelSchema),
  comment: Type.Optional(commentSchema),
  sender: userSchema,
  repository: repositorySchema,
  organization: Type.Optional(organizationSchema),
  installation: Type.Optional(installationSchema),
  repositories_added: Type.Optional(Type.Array(repositorySchema)),
  changes: Type.Optional(changesSchema),
});

export type GitHubPayload = Static<typeof payloadSchema>;

const pushSchema = Type.Object({
  ref: Type.String(),
  action: Type.String(),
  before: Type.String(),
  after: Type.String(),
  repository: repositorySchema,
  sender: userSchema,
  created: Type.Boolean(),
  deleted: Type.Boolean(),
  forced: Type.Boolean(),
  commits: Type.Array(commitsSchema),
  head_commit: commitsSchema,
  installation: Type.Optional(installationSchema),
});

export type GitHubPushPayload = Static<typeof pushSchema>;

const githubContentSchema = Type.Object({
  type: Type.String(),
  encoding: Type.String(),
  size: Type.Number(),
  name: Type.String(),
  path: Type.String(),
  content: Type.String(),
  sha: Type.String(),
  url: Type.String(),
  git_url: Type.String(),
  html_url: Type.String(),
  download_url: Type.String(),
  _links: Type.Union([
    Type.Undefined(),
    Type.Object({
      git: Type.String(),
      self: Type.String(),
      html: Type.String(),
    }),
  ]),
});

export type GithubContent = Static<typeof githubContentSchema>;
// type GitHubOrganization = {
//   login: string;
//   id: number;
//   node_id: string;
//   url: string;
//   repos_url: string;
//   events_url: string;
//   hooks_url: string;
//   issues_url: string;
//   members_url: string;
//   public_members_url: string;
//   avatar_url: string;
//   description: string;
// };

// type GitHubOrganizationPayload = {
//   action: string;
//   membership?: {
//     url: string;
//     state: string;
//     role: string;
//     organization_url: string;
//     user: {
//       login: string;
//       id: number;
//       node_id: string;
//       avatar_url: string;
//       gravatar_id: string;
//       url: string;
//       html_url: string;
//       followers_url: string;
//       following_url: string;
//       gists_url: string;
//       starred_url: string;
//       subscriptions_url: string;
//       organizations_url: string;
//       repos_url: string;
//       events_url: string;
//       received_events_url: string;
//       type: string;
//       site_admin: boolean;
//     };
//   };
//   organization: GitHubOrganization;
//   sender: {
//     login: string;
//     id: number;
//     node_id: string;
//     avatar_url: string;
//     gravatar_id: string;
//     url: string;
//     html_url: string;
//     followers_url: string;
//     following_url: string;
//     gists_url: string;
//     starred_url: string;
//     subscriptions_url: string;
//     organizations_url: string;
//     repos_url: string;
//     events_url: string;
//     received_events_url: string;
//     type: string;
//     site_admin: boolean;
//   };
// };
