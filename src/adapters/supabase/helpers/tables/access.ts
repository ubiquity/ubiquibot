import { SupabaseClient } from "@supabase/supabase-js";
import { Comment } from "../../../../types/payload";
import { Database } from "../../types/database";
import { GitHubNode } from "../client";
import { Super } from "./super";
import { UserRow } from "./user";
export type AccessRow = Database["public"]["Tables"]["access"]["Row"];
export type AccessInsert = Database["public"]["Tables"]["access"]["Insert"];
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
    const { data, error } = await this.supabase.from("access").select("*, users(*)").filter("id", "eq", id);

    if (error) {
      this.runtime.logger.error(error.message, error);
      throw new Error(error.message);
    }
    return data;
  }

  public async getAccess(id: number): Promise<AccessRow | null> {
    const userWithAccess = await this._getUserWithAccess(id);
    if (userWithAccess[0]?.access === undefined) {
      this.runtime.logger.debug("Access is undefined");
      return null;
    }
    if (userWithAccess[0]?.access === null) throw new Error("Access is null");
    return userWithAccess[0].access;
  }

  public async setAccess(labels: string[], node: GitHubNode, userId?: number): Promise<null> {
    const { data, error } = await this.supabase.from("access").upsert({
      labels: labels,
      ...node,
      user_id: userId,
    } as AccessInsert);
    if (error) throw new Error(error.message);
    return data;
  }

  async upsertMultiplier(userId: number, multiplier: number, reason: string, comment: Comment) {
    try {
      const accessData: _Access = {
        user_id: userId,
        multiplier: multiplier,
        multiplier_reason: reason,
        node_id: comment.node_id,
        node_type: "IssueComment",
        node_url: comment.html_url,
      };

      const { data, error } = await this.supabase.from("access").upsert(accessData, { onConflict: "location_id" });

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Multiplier not upserted");
    } catch (error) {
      console.error("An error occurred while upserting multiplier:", error);
    }
  }
}
