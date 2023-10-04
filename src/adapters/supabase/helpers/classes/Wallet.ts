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
type UserWithWallet = (UserRow & { wallets: WalletRow })[];
import { graphql } from "@octokit/graphql";

export class Wallet extends User {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async _getWallet(id: number): Promise<UserWithWallet> {
    const { data, error } = await this.supabase.from("users").select("*, wallets(*)").filter("id", "eq", id);
    if (error) throw error;
    return data;
  }

  async getAddress(id: number): Promise<string> {
    const data = await this._getWallet(id);
    if (data[0].wallets.address === null) throw new Error("Wallet address is null");
    return data[0].wallets.address;
  }

  async getWalletCommentUrl(nodeId: string): Promise<string> {
    const response = await graphql(
      `query {
        node(id: "${nodeId}") {
          ... on IssueComment {
            url
          }
        }
      }`,
      {
        headers: {
          authorization: `token ${process.env.TEST_ADMIN_PAT}`,
        },
      }
    );
    return response.node.url;
  }

  // async _get(id: string): Promise<WalletResponse> {
  //   const { data, error } = await supabase.from("wallets").select("*").eq("id", id);
  //   if (error) throw error;
  //   return data;
  // }

  // async _upsert(node: GitHubNode, upserting: WalletData): Promise<WalletResponse> {
  //   const { data, error } = await supabase.from("wallets").upsert(Object.assign(upserting, node));
  //   if (error) throw error;
  //   return data;
  // }

  // async _delete(id: string): Promise<null> {
  //   const { error } = await supabase.from("wallets").delete().eq("id", id);
  //   if (error) throw error;
  //   return null;
  // }
}
