import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";
import { Super } from "./super";

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export class User extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async getUserId(username: string): Promise<number> {
    const octokit = this.runtime.eventContext.octokit;
    const { data } = await octokit.rest.users.getByUsername({ username });
    return data.id;
  }

  public async getMultiplier(userId: number, repositoryId: number): Promise<{ value: number; reason: string } | null> {
    // this gets every location id from every registered location in the repository
    const { data: locationData, error } = await this.supabase
      .from("locations")
      .select("id")
      .eq("repository_id", repositoryId);

    if (error) throw this.runtime.logger.error("Error getting location data", error);

    // cross reference the location id with the access table to see if the user has a multiplier

    if (locationData && locationData.length > 0) {
      // check all the access sets for the user in the repository
      const locationIdsInCurrentRepository = locationData.map((location) => location.id as string);

      const { data: accessData, error: accessError } = await this.supabase
        .from("access")
        .select("multiplier, multiplier_reason")
        .in("location_id", locationIdsInCurrentRepository)
        .eq("user_id", userId)
        .order("id", { ascending: false }) // get the latest one
        .single();

      if (accessError) throw this.runtime.logger.error("Error getting access data", accessError);

      if (accessData) {
        // The user at that repository has that multiplier
        // Return the multiplier and the reason
        return {
          value: accessData.multiplier,
          reason: accessData.multiplier_reason,
        };
      }
    }

    return null;
  }
}
