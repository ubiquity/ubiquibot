import { SupabaseClient } from "@supabase/supabase-js";
import { Super } from "./super";
import { Database } from "../../types/database";

// currently trying to save all of the location metadata of the event.
// seems that focusing on the IssueComments will provide the most value

type LocationsRow = Database["public"]["Tables"]["logs"]["Row"];
export class Locations extends Super {
  locationResponse: LocationsRow | undefined;

  user_id: string | undefined;
  comment_id: string | undefined;
  issue_id: string | undefined;
  repository_id: string | undefined;
  node_id: string | undefined;
  node_type: string | undefined;

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async getLocationsFromRepo(repositoryId: number) {
    const { data: locationData, error } = await this.supabase
      .from("locations")
      .select("id")
      .eq("repository_id", repositoryId);

    if (error) throw this.runtime.logger.fatal("Error getting location data", new Error(error.message));
    return locationData;
  }
}
