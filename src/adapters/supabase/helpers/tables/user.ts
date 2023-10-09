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

  public async getMultiplier(user_id: number, repository_id: number) {
    const { data: locationData, error: locationError } = await this.supabase
      .from("locations")
      .select("id")
      .eq("repository_id", repository_id);
    if (locationError) throw locationError;

    const location_id = locationData[0].id;

    const { data, error } = await this.supabase
      .from("access")
      .select("multiplier, multiplier_reason")
      .eq("user_id", user_id)
      .eq("location_id", location_id)
      .single();
    if (error) throw error;

    return {
      value: data.multiplier ?? 1,
      reason: data.multiplier_reason,
    };
  }
  private async _lookupRepository(repository_id: number) {
    const { data, error } = await this.supabase.from("repository").select("id").eq("repository_id", repository_id);
    if (error) throw error;
    return data;
  }
}
