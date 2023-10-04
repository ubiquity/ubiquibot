// import { getLogger } from "../../../bindings";

// const logger = getLogger();

export type GitHubNode = {
  id: string;
  type: GitHubNodeTypes;
};

enum GitHubNodeTypes {
  USER = "user",
  ORGANIZATION = "organization",
  REPOSITORY = "repository",
  ISSUE = "issue",
  COMMENT = "comment",
}
