import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types";
import { Super } from "./Super";
export type LabelRow = Database["public"]["Tables"]["labels"]["Row"];
export class Label extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async getLabelChanges(repositoryNodeId: string): Promise<LabelRow[]> {
    const locationId = await this._getRepositoryLocationId(repositoryNodeId);
    const unauthorizedLabelChanges = await this._getUnauthorizedLabelChanges(locationId);
    return unauthorizedLabelChanges;
  }

  async approveLabelChange(id: number): Promise<null> {
    const { data, error } = await this.client.from("labels").update({ authorized: true }).eq("id", id);
    if (error) throw error;
    return data;
  }

  private async _getUnauthorizedLabelChanges(locationId: number): Promise<LabelRow[]> {
    // Get label changes that are not authorized in the repository
    const { data, error } = await this.client
      .from("labels")
      .select("*")
      .eq("location_id", locationId)
      .eq("authorized", false);

    if (error) throw error;

    return data;
  }

  private async _getRepositoryLocationId(nodeId: string) {
    // Get the location_id for the repository from the locations table
    const { data: locationData, error: locationError } = await this.client
      .from("locations")
      .select("id")
      .eq("node_id", nodeId)
      .single();

    if (locationError) throw locationError;
    if (!locationData) throw new Error("Location not found");

    const locationId = locationData.id;
    return locationId;
  }
}
