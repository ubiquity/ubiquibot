import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";
import { GitHubNode } from "../client";
import { WalletResponse, WalletRow } from "./Wallet";
// const { supabase } = getAdapters();
type UserData = Database["public"]["Tables"]["users"]["Insert"] | Database["public"]["Tables"]["users"]["Update"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserResponse = UserRow[] | null;

type UserWithWallet = (UserRow & { wallets: WalletRow })[];

export class User {
  supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async _get(id: number): Promise<UserResponse> {
    const { data, error } = await this.supabase.from("users").select("*").eq("id", id);
    if (error) throw error;
    return data;
  }

  async _getWallet(id: number): Promise<UserWithWallet> {
    const { data, error } = await this.supabase.from("users").select("*, wallets(*)").filter("id", "eq", id);
    if (error) throw error;
    return data;
  }

  async getWalletAddress(id: number): Promise<string> {
    const data = await this._getWallet(id);
    if (data[0].wallets.address === null) throw new Error("Wallet address is null");
    return data[0].wallets.address;
  }

  async _upsert(node: GitHubNode, upserting: UserData): Promise<UserResponse> {
    const { data, error } = await this.supabase.from("users").upsert(Object.assign(upserting, node));
    if (error) throw error;
    return data;
  }

  async _delete(id: number): Promise<null> {
    const { error } = await this.supabase.from("users").delete().eq("id", id);
    if (error) throw error;
    return null;
  }
}
