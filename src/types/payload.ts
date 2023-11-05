// https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads

import { Static, Type } from "@sinclair/typebox";
import { LabelSchema } from "./label";

export enum GitHubEvent {
  // issues events
  ISSUES_LABELED = "issues.labeled",
  ISSUES_UNLABELED = "issues.unlabeled",
  ISSUES_ASSIGNED = "issues.assigned",
  ISSUES_UNASSIGNED = "issues.unassigned",
  ISSUES_CLOSED = "issues.closed",
  ISSUES_OPENED = "issues.opened",
  ISSUES_REOPENED = "issues.reopened",

  // issue_comment
  ISSUE_COMMENT_CREATED = "issue_comment.created",
  ISSUE_COMMENT_EDITED = "issue_comment.edited",

  // pull_request
  PULL_REQUEST_OPENED = "pull_request.opened",

  // installation event
  INSTALLATION_ADDED_EVENT = "installation_repositories.added",

  // push event
  PUSH_EVENT = "push",

  // label
  LABEL_EDITED = "label.edited",
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
  NOT_PLANNED = "not_planned",
  REOPENED = "reopened",
}

const UserSchema = Type.Object({
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

export type User = Static<typeof UserSchema>;
// type UserProfile= Static<typeof UserProfileSchema>;
export enum _AuthorAssociation {
  OWNER = "OWNER",
  COLLABORATOR = "COLLABORATOR",
  MEMBER = "MEMBER",
  CONTRIBUTOR = "CONTRIBUTOR",
  FIRST_TIMER = "FIRST_TIMER",
  FIRST_TIME_CONTRIBUTOR = "FIRST_TIME_CONTRIBUTOR",
  NONE = "NONE",
}
// const AuthorAssociation = Type.Enum(_AuthorAssociation);

const IssueSchema = Type.Object({
  url: Type.String(),
  repository_url: Type.String(),
  labels_url: Type.String(),
  comments_url: Type.String(),
  events_url: Type.String(),
  html_url: Type.String(),
  id: Type.Number(),
  body: Type.String(),
  node_id: Type.String(),
  number: Type.Number(),
  title: Type.String(),
  user: UserSchema,
  labels: Type.Array(LabelSchema),
  state: Type.Enum(IssueType),
  state_reason: Type.Union([Type.Enum(StateReason), Type.Null()]),
  locked: Type.Boolean(),
  assignee: Type.Union([Type.Null(), UserSchema]),
  assignees: Type.Array(Type.Union([Type.Null(), UserSchema])),
  comments: Type.Number(),
  created_at: Type.String({ format: "date-time" }),
  updated_at: Type.String({ format: "date-time" }),
  closed_at: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  author_association: Type.Enum(_AuthorAssociation),
  // OWNER: The author is an owner of the repository.
  // COLLABORATOR: The author is a collaborator on the repository.
  // MEMBER: The author is a member of the organization that owns the repository.
  // CONTRIBUTOR: The author has contributed to the repository but is not a collaborator, member, or owner.
  // FIRST_TIMER: The author is a first-time contributor to the repository.
  // FIRST_TIME_CONTRIBUTOR: Similar to "FIRST_TIMER," the author is a first-time contributor to the repository.
  // NONE: The author does not have any specific association with the repository.
});

export type Issue = Static<typeof IssueSchema>;

const RepositorySchema = Type.Object({
  id: Type.Number(),
  node_id: Type.String(),
  name: Type.String(),
  full_name: Type.String(),
  private: Type.Boolean(),
  owner: UserSchema,
  html_url: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  fork: Type.Boolean(),
  url: Type.String(),
  forks_url: Type.String(),
  keys_url: Type.String(),
  collaborators_url: Type.String(),
  teams_url: Type.String(),
  hooks_url: Type.String(),
  issue_events_url: Type.String(),
  events_url: Type.String(),
  assignees_url: Type.String(),
  branches_url: Type.String(),
  tags_url: Type.String(),
  blobs_url: Type.String(),
  git_tags_url: Type.String(),
  git_refs_url: Type.String(),
  trees_url: Type.String(),
  statuses_url: Type.String(),
  languages_url: Type.String(),
  stargazers_url: Type.String(),
  contributors_url: Type.String(),
  subscribers_url: Type.String(),
  subscription_url: Type.String(),
  commits_url: Type.String(),
  git_commits_url: Type.String(),
  comments_url: Type.String(),
  issue_comment_url: Type.String(),
  contents_url: Type.String(),
  compare_url: Type.String(),
  merges_url: Type.String(),
  archive_url: Type.String(),
  downloads_url: Type.String(),
  issues_url: Type.String(),
  pulls_url: Type.String(),
  milestones_url: Type.String(),
  notifications_url: Type.String(),
  labels_url: Type.String(),
  releases_url: Type.String(),
  deployments_url: Type.String(),
  created_at: Type.String({ format: "date-time" }),
  updated_at: Type.String({ format: "date-time" }),
  pushed_at: Type.String({ format: "date-time" }),
  git_url: Type.String(),
  ssh_url: Type.String(),
  clone_url: Type.String(),
  svn_url: Type.String(),
  size: Type.Number(),
  stargazers_count: Type.Number(),
  watchers_count: Type.Number(),
  language: Type.Any(),
  has_issues: Type.Boolean(),
  has_projects: Type.Boolean(),
  has_downloads: Type.Boolean(),
  has_wiki: Type.Boolean(),
  has_pages: Type.Boolean(),
  forks_count: Type.Number(),
  archived: Type.Boolean(),
  disabled: Type.Boolean(),
  open_issues_count: Type.Number(),
  license: Type.Any(),
  allow_forking: Type.Boolean(),
  is_template: Type.Boolean(),
  web_commit_signoff_required: Type.Boolean(),
  topics: Type.Array(Type.Any()),
  visibility: Type.String(),
  forks: Type.Number(),
  open_issues: Type.Number(),
  watchers: Type.Number(),
  default_branch: Type.String(),
});

export type Repository = Static<typeof RepositorySchema>;

const OrganizationSchema = Type.Object({
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

const CommitsSchema = Type.Object({
  id: Type.String(),
  distinct: Type.Boolean(),
  added: Type.Array(Type.String()),
  removed: Type.Array(Type.String()),
  modified: Type.Array(Type.String()),
});

export type CommitsPayload = Static<typeof CommitsSchema>;

const InstallationSchema = Type.Object({
  id: Type.Number(),
  node_id: Type.String(),
});

const CommentSchema = Type.Object({
  url: Type.String(),
  html_url: Type.String(),
  issue_url: Type.String(),
  id: Type.Number(),
  node_id: Type.String(),
  user: UserSchema,
  created_at: Type.String({ format: "date-time" }),
  updated_at: Type.String({ format: "date-time" }),
  author_association: Type.String(),
  body: Type.String(),
  body_html: Type.Optional(Type.String()),
  body_text: Type.Optional(Type.String()),
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

export type Comment = Static<typeof CommentSchema>;

const AssignEventSchema = Type.Object({
  url: Type.String(),
  id: Type.Number(),
  node_id: Type.String(),
  event: Type.String(),
  commit_id: Type.String(),
  commit_url: Type.String(),
  created_at: Type.String({ format: "date-time" }),
  actor: UserSchema,
  assignee: UserSchema,
  assigner: UserSchema,
});

export type AssignEvent = Static<typeof AssignEventSchema>;

const ChangesSchema = Type.Object({
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

export const PayloadSchema = Type.Object({
  action: Type.String(),
  issue: Type.Optional(IssueSchema),
  label: Type.Optional(LabelSchema),
  comment: Type.Optional(CommentSchema),
  sender: UserSchema,
  repository: RepositorySchema,
  organization: Type.Optional(OrganizationSchema),
  installation: Type.Optional(InstallationSchema),
  repositories_added: Type.Optional(Type.Array(RepositorySchema)),
  changes: Type.Optional(ChangesSchema),
});

export type Payload = Static<typeof PayloadSchema>;

const PushSchema = Type.Object({
  ref: Type.String(),
  action: Type.String(),
  before: Type.String(),
  after: Type.String(),
  repository: RepositorySchema,
  sender: UserSchema,
  created: Type.Boolean(),
  deleted: Type.Boolean(),
  forced: Type.Boolean(),
  commits: Type.Array(CommitsSchema),
  head_commit: CommitsSchema,
  installation: Type.Optional(InstallationSchema),
});

export type PushPayload = Static<typeof PushSchema>;

const GithubContentSchema = Type.Object({
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

export type GithubContent = Static<typeof GithubContentSchema>;
export type Organization = {
  login: string;
  id: number;
  node_id: string;
  url: string;
  repos_url: string;
  events_url: string;
  hooks_url: string;
  issues_url: string;
  members_url: string;
  public_members_url: string;
  avatar_url: string;
  description: string;
};

export type OrganizationPayload = {
  action: string;
  membership?: {
    url: string;
    state: string;
    role: string;
    organization_url: string;
    user: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      gravatar_id: string;
      url: string;
      html_url: string;
      followers_url: string;
      following_url: string;
      gists_url: string;
      starred_url: string;
      subscriptions_url: string;
      organizations_url: string;
      repos_url: string;
      events_url: string;
      received_events_url: string;
      type: string;
      site_admin: boolean;
    };
  };
  organization: Organization;
  sender: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
};
