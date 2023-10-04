export type GitHubNode = {
  id: string;
  type: GitHubNodeTypes;
  url?: string; // not yet implemented, needs database triggers and database columns to be added
};

enum GitHubNodeTypes {
  USER = "user",
  ORGANIZATION = "organization",
  REPOSITORY = "repository",
  ISSUE = "issue",
  COMMENT = "comment",
}
