import { SupabaseClient } from "@supabase/supabase-js";
import { Comment } from "../../../../types/payload";
import { Database } from "../../types/database";
import { GitHubNode } from "../client";
import { Super } from "./_super";
import { UserRow } from "./_user";
type AccessRow = Database["public"]["Tables"]["access"]["Row"];
// type AccessResponse = AccessRow[] | null;
type UserWithAccess = (UserRow & { access: AccessRow | null })[];

type _Access = {
  user_id: number;
  multiplier: number;
  multiplier_reason: string;
  node_id: string;
  node_type: string;
  node_url: string;
};

export class Access extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  private async _getUserWithAccess(id: number): Promise<UserWithAccess> {
    const { data, error } = await this.client.from("access").select("*, access(*)").filter("id", "eq", id);
    if (error) throw error;
    return data;
  }

  public async getAccess(id: number): Promise<AccessRow> {
    const userWithAccess = await this._getUserWithAccess(id);

    if (userWithAccess[0]?.access === undefined) throw new Error("Access is undefined");
    if (userWithAccess[0]?.access === null) throw new Error("Access is null");
    return userWithAccess[0].access;
  }

  public async setAccess(access: string[], node: GitHubNode, userId: number): Promise<null> {
    const { data, error } = await this.client.from("access").upsert({ access, ...node, id: userId });
    if (error) throw error;
    return data;
  }

  // public async getAccessRegistrationUrl(id: number): Promise<string> {
  //   const userWithAccess = await this._getUserWithAccess(id);
  //   if (!userWithAccess[0].access) throw new Error("Access of access registration comment is null");
  //   if (!userWithAccess[0].access.location_id) throw new Error("Location id of access registration comment is null");

  //   const locationId = userWithAccess[0].access.location_id;

  //   const { data, error } = await this.client.from("locations").select("*").eq("id", locationId);
  //   if (error) throw error;
  //   const nodeUrl = data[0].node_url;
  //   if (!nodeUrl) throw new Error("Node URL of access registration comment is null");

  //   return nodeUrl;
  // }

  async upsertMultiplier(userId: number, multiplier: number, reason: string, comment: Comment): Promise<void> {
    try {
      const accessData: _Access = {
        user_id: userId,
        multiplier: multiplier,
        multiplier_reason: reason,
        node_id: comment.node_id,
        node_type: "IssueComment",
        node_url: comment.html_url,
      };

      // Upsert into the access table
      //   .upsert(accessData, { onConflict: ["user_id", "node_id"] });
      const { data, error } = await this.client.from("access").upsert(accessData, { onConflict: "location_id" });

      if (error) throw error;
      if (!data) throw new Error("Multiplier not upserted");
    } catch (error) {
      console.error("An error occurred while upserting multiplier:", error);
    }
  }
}
