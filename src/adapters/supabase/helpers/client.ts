import { Database } from "../types/database";

export type GitHubNode = {
  id: string;
  type: GitHubNodeType;
  url?: string; // not yet implemented, needs database triggers and database columns to be added
};

export type GitHubNodeType = Database["public"]["Enums"]["github_node_type"]; // Manually searched for every type that supports `url`
