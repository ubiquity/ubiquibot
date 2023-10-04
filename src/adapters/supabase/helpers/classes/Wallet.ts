import { PostgrestError } from "@supabase/supabase-js";
import { getAdapters } from "../../../../bindings/event";
import { Database } from "../../types/database";
import { GitHubNode } from "../client";
const { supabase } = getAdapters();
type WalletData = Database["public"]["Tables"]["wallets"]["Insert"] | Database["public"]["Tables"]["wallets"]["Update"];
export type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletResponse = WalletRow[] | null;
export class Wallet {
  async _get(id: string): Promise<WalletResponse> {
    const { data, error } = await supabase.from("wallets").select("*").eq("id", id);
    if (error) throw error;
    return data;
  }

  async _upsert(node: GitHubNode, upserting: WalletData): Promise<WalletResponse> {
    const { data, error } = await supabase.from("wallets").upsert(Object.assign(upserting, node));
    if (error) throw error;
    return data;
  }

  async _delete(id: string): Promise<null> {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    if (error) throw error;
    return null;
  }
}
