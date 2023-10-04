import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getAdapters } from "../../../../bindings/event";
import { Database } from "../../types/database";
import { GitHubNode } from "../client";
import { WalletResponse } from "./Wallet";
// const { supabase } = getAdapters();
type UserData = Database["public"]["Tables"]["users"]["Insert"] | Database["public"]["Tables"]["users"]["Update"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserResponse = UserRow[] | null;
export class User {
  supabase: SupabaseClient;
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  async get(id: number): Promise<UserResponse> {
    const { data, error } = await this.supabase.from("users").select("*").eq("id", id);
    if (error) {
      // logger.error(`Error getting user with id ${id}: ${error.message}`);
      throw error;
    }
    return data;
  }

  async getWallet(id: number): Promise<WalletResponse> {
    // const { data, error } = await this.supabase
    //   .from("users")
    //   .select("users.*, wallets.*")
    //   .filter("users.id", "eq", id)
    //   .filter("wallets.wallet_id", "eq", "users.id");
    const { data, error } = await this.supabase.from("users").select("*, wallets(*)").filter("id", "eq", id);

    // const { data, error } = await this.supabase
    // .from("users")
    // .select("id, wallet_id")
    // .filter("users.id", "eq", id)
    // .filter("wallets.wallet_id", "eq", "users.id");

    if (error) {
      // logger.error(`Error getting user with id ${id}: ${error.message}`);
      throw error;
    }
    return data;
  }

  async upsert(node: GitHubNode, upserting: UserData): Promise<UserResponse> {
    const { data, error } = await this.supabase.from("users").upsert(Object.assign(upserting, node));
    if (error) {
      // logger.error(`Error upserting user: ${error.message}`);
      throw error;
    }
    return data;
  }

  async delete(id: number): Promise<null> {
    const { error } = await this.supabase.from("users").delete().eq("id", id);
    if (error) {
      // logger.error(`Error deleting user with id ${id}: ${error.message}`);
      throw error;
    }
    return null;
  }
}
