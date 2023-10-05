import { SupabaseClient } from "@supabase/supabase-js";
import { GitHubNode } from "../client";
import { Super } from "./Super";

export class Label extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async getChanges(labels: string[], node: GitHubNode, userId: number) {
    // const response = await this.client
    //   .from("labels")
    //   .select("*")
    //   .in("label_to", labels)
    //   .eq("repository", repository)
    //   .eq("authorized", false);
  }

  private async _getRepositoryLocationId(repository: string): Promise<number> {
    const { data, error } = await this.client.from("locations").select("location_id").eq("name", repository);
    if (error) throw error;
    return data[0].location_id;
  }
}
