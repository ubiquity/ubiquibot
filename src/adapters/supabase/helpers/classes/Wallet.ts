import dotenv from "dotenv";
dotenv.config();
import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getAdapters } from "../../../../bindings/event";
import { Database } from "../../types/database";
import { GitHubNode } from "../client";
import { User, UserRow } from "./User";
const { supabase } = getAdapters();
type WalletData = Database["public"]["Tables"]["wallets"]["Insert"] | Database["public"]["Tables"]["wallets"]["Update"];
export type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletResponse = WalletRow[] | null;
type UserWithWallet = (UserRow & { wallets: WalletRow | null })[];
// import { graphql } from "@octokit/graphql";

// import supported graphql node types from github
import { GitHubNodeType } from "../client";

export class Wallet extends User {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  private async _getUserWithWallet(id: number): Promise<UserWithWallet> {
    const { data, error } = await this.supabase.from("users").select("*, wallets(*)").filter("id", "eq", id);
    if (error) throw error;
    return data;
  }
  // private async _getNodeUrl(nodeId: string, nodeType: GitHubNodeType): Promise<string | undefined> {
  //   // "No such type comment, so it can't be a fragment condition"
  //   // means that nodeType is not supported by GitHub GraphQL API
  //   //
  //   // https://docs.github.com/en/graphql/reference/objects

  //   const response: { node: { url?: string } } = await graphql(
  //     `query {
  //       node(id: "${nodeId}") {
  //         ... on ${nodeType} {
  //           url
  //         }
  //       }
  //     }`,
  //     {
  //       headers: {
  //         authorization: `token ${process.env.TEST_ADMIN_PAT}`,
  //       },
  //     }
  //   );

  //   return response.node.url;
  // }
  public async getAddress(id: number): Promise<string> {
    const userWithWallet = await this._getUserWithWallet(id);

    if (userWithWallet[0]?.wallets?.address === undefined) throw new Error("Wallet address is undefined");
    if (userWithWallet[0]?.wallets?.address === null) throw new Error("Wallet address is null");
    return userWithWallet[0]?.wallets?.address;
  }
  // public async setAddress(node: GitHubNode, address: string): Promise<unknown> {
  //   const { data, error } = await this.supabase.from("wallets").upsert({ address, ...node });
  //   if (error) throw error;
  //   return data;
  // }

  public async getWalletRegistrationUrl(id: number): Promise<string> {
    const userWithWallet = await this._getUserWithWallet(id);
    if (!userWithWallet[0].wallets) throw new Error("Wallet of wallet registration comment is null");
    if (!userWithWallet[0].wallets.location_id) throw new Error("Location id of wallet registration comment is null");

    const locationId = userWithWallet[0].wallets.location_id;

    const { data, error } = await this.supabase.from("locations").select("*").eq("id", locationId);
    if (error) throw error;
    const nodeUrl = data[0].node_url;
    if (!nodeUrl) throw new Error("Node URL of wallet registration comment is null");

    return nodeUrl;
  }

  // public async lookupWalletRegistrationUrl(id: number): Promise<string> {
  //   const userWithWallet = await this._getUserWithWallet(id);
  //   console.trace(userWithWallet);
  //   if (!userWithWallet[0].wallets) throw new Error("Wallet of wallet registration comment is null");
  //   if (!userWithWallet[0].wallets.location_id) throw new Error("Location id of wallet registration comment is null");

  //   const locationId = userWithWallet[0].wallets.location_id;

  //   const { data, error } = await this.supabase.from("locations").select("*").eq("id", locationId);
  //   if (error) throw error;

  //   const nodeId = data[0].node_id;
  //   if (!nodeId) throw new Error("Node id of wallet registration comment is null");

  //   const nodeType = data[0].node_type;
  //   if (!nodeType) throw new Error("Node type of wallet registration comment is null");

  //   const url = await this._getNodeUrl(nodeId, nodeType);
  //   return url;
  // }
  // private async _get(id: string): Promise<WalletResponse> {
  //   const { data, error } = await supabase.from("wallets").select("*").eq("id", id);
  //   if (error) throw error;
  //   return data;
  // }

  // private async _upsert(node: GitHubNode, upserting: WalletData): Promise<WalletResponse> {
  //   const { data, error } = await supabase.from("wallets").upsert(Object.assign(upserting, node));
  //   if (error) throw error;
  //   return data;
  // }

  // private async _delete(id: string): Promise<null> {
  //   const { error } = await supabase.from("wallets").delete().eq("id", id);
  //   if (error) throw error;
  //   return null;
  // }
}
