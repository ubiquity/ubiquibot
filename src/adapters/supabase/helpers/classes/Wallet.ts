import { PostgrestError } from "@supabase/supabase-js";
import { getAdapters } from "../../../../bindings/event";
import { Database } from "../../types/database";
import { GitHubNode } from "../client";
const { supabase } = getAdapters();
type WalletData = Database["public"]["Tables"]["wallets"]["Insert"] | Database["public"]["Tables"]["wallets"]["Update"];
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletResponse = WalletRow[] | null;
export class Wallet {
  async get(id: string): Promise<WalletResponse> {
    const { data, error } = await supabase.from("wallets").select("*").eq("id", id);
    if (error) {
      // logger.error(`Error getting wallet with id ${id}: ${error.message}`);
      throw error;
    }
    return data;
  }

  async upsert(node: GitHubNode, upserting: WalletData): Promise<WalletResponse> {
    const { data, error } = await supabase.from("wallets").upsert(Object.assign(upserting, node));
    if (error) {
      // logger.error(`Error upserting wallet: ${error.message}`);
      throw error;
    }
    return data;
  }

  async delete(id: string): Promise<null> {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    if (error) {
      // logger.error(`Error deleting wallet with id ${id}: ${error.message}`);
      throw error;
    }
    return null;
  }
}
