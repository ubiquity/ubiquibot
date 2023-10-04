import { SupabaseClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Database } from "../../types/database";
// import { Wallet, WalletResponse, WalletRow } from "./Wallet";

// const { supabase } = getAdapters();
// type UserData = Database["public"]["Tables"]["users"]["Insert"] | Database["public"]["Tables"]["users"]["Update"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
// type UserResponse = UserRow[] | null;

export class User {
  supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    // this.wallet = new Wallet(supabase);
  }

  // async _get(id: number): Promise<UserResponse> {
  //   const { data, error } = await this.supabase.from("users").select("*").eq("id", id);
  //   if (error) throw error;
  //   return data;
  // }

  // async _upsert(node: GitHubNode, upserting: UserData): Promise<UserResponse> {
  //   const { data, error } = await this.supabase.from("users").upsert(Object.assign(upserting, node));
  //   if (error) throw error;
  //   return data;
  // }

  // async _delete(id: number): Promise<null> {
  //   const { error } = await this.supabase.from("users").delete().eq("id", id);
  //   if (error) throw error;
  //   return null;
  // }

  public async getUserId(username: string, token?: string): Promise<number> {
    const url = `https://api.github.com/users/${username}`;
    const headers = token ? { Authorization: `token ${token}` } : undefined;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  public async getMultiplier(user_id: number, repo_id: number): Promise<{ value: number; reason: string | null }> {
    const { data, error } = await this.supabase.from("access").select("multiplier, multiplier_reason").eq("user_id", user_id).eq("repo_id", repo_id);
    if (error) throw error;

    const { multiplier, multiplier_reason } = data[0];

    return {
      value: multiplier ?? 1,
      reason: multiplier_reason,
    };
  }
}
