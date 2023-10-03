import { PostgrestError } from "@supabase/supabase-js";
import { getAdapters, getLogger } from "../../../bindings";
import { Database } from "../types/database";

const { supabase } = getAdapters();
const logger = getLogger();

type GitHubNode = {
  id: string;
  type: GitHubNodeTypes;
};

enum GitHubNodeTypes {
  USER = "user",
  ORGANIZATION = "organization",
  REPOSITORY = "repository",
  ISSUE = "issue",
  COMMENT = "comment",
}

type WalletData = Database["public"]["Tables"]["wallets"]["Insert"] | Database["public"]["Tables"]["wallets"]["Update"];
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type WalletResponse = { data: WalletRow[] | null; error: PostgrestError | null };

class Wallet {
  async get(id: string): Promise<WalletResponse> {
    const { data, error } = await supabase.from("wallets").select("*").eq("id", id);
    return { data, error };
  }

  async upsert(node: GitHubNode, upserting: WalletData): Promise<WalletResponse> {
    const { data: upsertedData, error } = await supabase.from("wallets").upsert(Object.assign(upserting, node));
    return { data: upsertedData, error };
  }

  async delete(id: string): Promise<{ error: PostgrestError | null }> {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    return { error };
  }
}

// type AccessData = Database["public"]["Tables"]["access"]["Insert"] | Database["public"]["Tables"]["access"]["Update"];
// type AccessRow = Database["public"]["Tables"]["access"]["Row"];
// type AccessResponse = { data: AccessRow[]; error: PostgrestError | null };

// class Access {
//   async upsert(data: AccessData): Promise<AccessResponse> {
//     const { data: upsertedData, error } = await supabase.from("access").upsert(data);
//     return { data: upsertedData, error };
//   }

//   async get(id: number): Promise<AccessResponse> {
//     const { data, error } = await supabase.from("access").select("*").eq("id", id);
//     return { data, error };
//   }

//   async delete(id: number): Promise<{ error: Error | null }> {
//     const { error } = await supabase.from("access").delete().eq("id", id);
//     return { error };
//   }
// }
