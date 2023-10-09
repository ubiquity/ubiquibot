import { Database } from "../types/database";

export type GitHubNode = {
  // will leave support for id and type until more research is completed to confirm that it can be removed
  node_id?: string;
  node_type?: GitHubNodeType;
  // use HTML URL so that administrators can easily audit the location of the node
  node_url: string;
};

export type GitHubNodeType = Database["public"]["Enums"]["github_node_type"]; // Manually searched for every type that supports `url`
