import { SupabaseClient } from "@supabase/supabase-js";
import { Comment } from "../../../../types/payload";
import { Super } from "./Super";

type _Debit = {
  // id: number;
  amount: number;
  node_id: string;
  node_type: string;
  node_url: string;
  // location_id: number;
};

type Settlement = {
  id: number;
  debit_id: number;
  user_id: number;
  location_id: number;
};

export class Debit extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async addPenalty(assignee: number, amount: number, comment: Comment): Promise<void> {
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
      const settlementData: Settlement = {
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
}
