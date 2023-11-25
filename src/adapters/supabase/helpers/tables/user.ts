import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";
import { Super } from "./super";
import { Context as ProbotContext } from "probot";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export class User extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async getUserId(context: ProbotContext, username: string): Promise<number> {
    const { data } = await context.octokit.rest.users.getByUsername({ username });
    return data.id;
  }

  public async getMultiplier(userId: number, repositoryId: number) {
    const locationData = await this.runtime.adapters.supabase.locations.getLocationsFromRepo(repositoryId);
    if (locationData && locationData.length > 0) {
      const accessData = await this._getAccessData(locationData, userId);
      if (accessData) {
        return {
          value: accessData.multiplier || null,
          reason: accessData.multiplier_reason || null,
        };
      }
    }
    return null;
  }

  private async _getAccessData(locationData: { id: number }[], userId: number) {
    const locationIdsInCurrentRepository = locationData.map((location) => location.id);

    const { data: accessData, error: accessError } = await this.supabase
      .from("access")
      .select("multiplier, multiplier_reason")
      .in("location_id", locationIdsInCurrentRepository)
      .eq("user_id", userId)
      .order("id", { ascending: false }) // get the latest one
      .maybeSingle();
    if (accessError) throw this.runtime.logger.error("Error getting access data", accessError);
    return accessData;
  }
}
