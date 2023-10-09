import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";
import { Super } from "./super";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export class User extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async getUserId(username: string): Promise<number> {
    const octokit = this.runtime.eventContext.octokit;
    const { data } = await octokit.rest.users.getByUsername({ username });
    return data.id;
  }

  public async getMultiplier(user_id: number, repo_id: number): Promise<{ value: number; reason: string | null }> {
    const { data, error } = await this.supabase
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
