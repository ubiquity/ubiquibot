import { SupabaseClient } from "@supabase/supabase-js";
import { Repository } from "../../../../types/payload";
import { Database } from "../../types";
import { Super } from "./super";
import { Context } from "../../../../types";
type LabelRow = Database["public"]["Tables"]["labels"]["Row"];
export class Label extends Super {
  constructor(supabase: SupabaseClient, context: Context) {
    super(supabase, context);
  }

  async saveLabelChange({
    previousLabel,
    currentLabel,
    authorized,
    repository,
  }: {
    previousLabel: string;
    currentLabel: string;
    authorized: boolean;
    repository: Repository;
  }): Promise<null> {
    const { data, error } = await this.supabase.from("labels").insert({
      label_from: previousLabel,
      label_to: currentLabel,
      authorized: authorized,
      node_id: repository.node_id,
      node_type: "Repository",
      node_url: repository.html_url,
    });

    if (error) throw error;
    return data;
  }

  async getLabelChanges(repositoryNodeId: string): Promise<LabelRow[]> {
    const locationId = await this._getRepositoryLocationId(repositoryNodeId);
    const unauthorizedLabelChanges = await this._getUnauthorizedLabelChanges(locationId);
    return unauthorizedLabelChanges;
  }

  async approveLabelChange(id: number): Promise<null> {
    const { data, error } = await this.supabase.from("labels").update({ authorized: true }).eq("id", id);
    if (error) throw error;
    return data;
  }

  private async _getUnauthorizedLabelChanges(locationId: number): Promise<LabelRow[]> {
    // Get label changes that are not authorized in the repository
    const { data, error } = await this.supabase
      .from("labels")
      .select("*")
      .eq("location_id", locationId)
      .eq("authorized", false);

    if (error) throw error;

    return data;
  }

  private async _getRepositoryLocationId(nodeId: string) {
    // Get the location_id for the repository from the locations table
    const { data: locationData, error: locationError } = await this.supabase
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
