import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";
import { Super } from "./super";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export class User extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async getUserId(username: string): Promise<number> {
    const octokit = this.runtime.latestEventContext.octokit;
    const { data } = await octokit.rest.users.getByUsername({ username });
    return data.id;
  }

  public async getMultiplier(userId: number, repositoryId: number): Promise<{ value: number; reason: string } | null> {
    const locationData = await this.runtime.adapters.supabase.locations.getLocationsFromRepo(repositoryId);
    if (locationData && locationData.length > 0) {
      const accessData = await this.getAccessData(locationData, userId);
      if (accessData) {
        return {
          value: accessData.multiplier,
          reason: accessData.multiplier_reason,
        };
      }
    }
    return null;
  }

  private async getAccessData(locationData: { id: number }[], userId: number) {
    const locationIdsInCurrentRepository = locationData.map((location) => location.id);

    const { data: accessData, error: accessError } = await this.supabase
      .from("access")
      .select("multiplier, multiplier_reason")
      .in("location_id", locationIdsInCurrentRepository)
      .eq("user_id", userId)
      .order("id", { ascending: false }) // get the latest one
      .single();

    if (accessError) throw this.runtime.logger.error("Error getting access data", new Error(accessError.message));
    return accessData;
  }
}
