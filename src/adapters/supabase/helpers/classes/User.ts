import { SupabaseClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import { Database } from "../../types/database";
import { Super } from "./Super";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export class User extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

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
    const { data, error } = await this.client
      .from("access")
      .select("multiplier, multiplier_reason")
      .eq("user_id", user_id)
      .eq("repo_id", repo_id);
    if (error) throw error;

    const { multiplier, multiplier_reason } = data[0];

    return {
      value: multiplier ?? 1,
      reason: multiplier_reason,
    };
  }
}
