import { Database } from "../types/database";

export type GitHubNode = {
  id: string;
  type: GitHubNodeType;
  url: string;
};

export type GitHubNodeType = Database["public"]["Enums"]["github_node_type"]; // Manually searched for every type that supports `url`
