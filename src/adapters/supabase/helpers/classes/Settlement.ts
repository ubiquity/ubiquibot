import { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
import { Comment } from "../../../../types/payload";
import { Super } from "./Super";
import { WalletRow } from "./Wallet";

type _Debit = {
  // id: number;
  amount: number;
  node_id: string;
  node_type: string;
  node_url: string;
  // location_id: number;
};

type _Settlement = {
  id: number;
  debit_id: number;
  user_id: number;
  location_id: number;
};

export class Settlement extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async addDebit(assignee: number, amount: number, comment: Comment): Promise<void> {
    try {
      // Insert into the debits table
      const debitData: _Debit = {
        amount: amount,
        node_id: comment.node_id,
        node_type: "IssueComment",
        node_url: comment.html_url,
      };

      const { data: debitInsertData, error: debitError } = await this.client
        .from("debits")
        .insert(debitData)
        .select("*")
        .single();

      if (debitError) throw debitError;
      if (!debitInsertData) throw new Error("Debit not inserted");

      // Insert into the settlements table
      const settlementData: _Settlement = {
        id: debitInsertData.id,
        debit_id: debitInsertData.id,
        user_id: assignee,
        location_id: debitInsertData.location_id, // Should be updated by trigger
      };

      const { data: settlementInsertData, error: settlementError } = await this.client
        .from("settlements")
        .insert(settlementData)
        .single();

      if (settlementError) throw settlementError;
      if (!settlementInsertData) throw new Error("Settlement not inserted");
    } catch (error) {
      console.error("An error occurred while adding penalty:", error);
    }
  }

  public async getWalletFromSettlement(settlementId: number): Promise<PostgrestResponse<WalletRow>> {
    // try {
    const { data: settlementData, error: settlementError } = await this.client
      .from("settlements")
      .select("user_id")
      .eq("id", settlementId)
      .single();

    if (settlementError) throw settlementError;
    if (!settlementData) throw new Error("Settlement not found");

    const userId = settlementData.user_id;

    const { data: userData, error: userError } = await this.client
      .from("users")
      .select("wallet_id")
      .eq("id", userId)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error("User not found");

    const walletId = userData.wallet_id;

    const { data: walletData, error: walletError } = await this.client
      .from("wallets")
      .select("*")
      .eq("id", walletId)
      .single();

    if (walletError) throw walletError;

    return walletData; // { data: walletData, error: null, status: 200, body: JSON.stringify(walletData) };
    // } catch (error) {
    // return { data: null, error, status: 400, body: error.message };

    // }
  }
}
