import { SupabaseClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import { Comment, Payload } from "../../../../types/payload";
import { Database } from "../../types/database";
import { Super } from "./super";
import { PermitTransactionData } from "../../../../handlers/comment/handlers/issue/generate-permit-2-signature";

type DebitInsert = Database["public"]["Tables"]["debits"]["Insert"];
type CreditInsert = Database["public"]["Tables"]["credits"]["Insert"];
type PermitInsert = Database["public"]["Tables"]["permits"]["Insert"];
type SettlementInsert = Database["public"]["Tables"]["settlements"]["Insert"];
type AddDebit = {
  userId: number;
  amount: Decimal;
  // comment: Comment;
  networkId: number;
  address: string;
};
type AddCreditWithPermit = {
  userId: number;
  amount: Decimal;
  comment: Comment;
  transactionData?: PermitTransactionData;
  networkId?: number;
  organization?: Payload["organization"];
};

export class Settlement extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  private async _lookupTokenId(networkId: number, address: string): Promise<number> {
    const { data: tokenData, error: tokenError } = await this.supabase
      .from("tokens")
      .select("id")
      .eq("network", networkId)
      .eq("address", address)
      .maybeSingle();

    if (tokenError) throw new Error(tokenError.message);
    if (!tokenData) throw new Error("Token not found");

    return tokenData.id;
  }

  public async addDebit({ userId, amount, networkId, address }: AddDebit) {
    // Lookup the tokenId
    const tokenId = await this._lookupTokenId(networkId, address);

    // Insert into the debits table
    const debitData: DebitInsert = {
      amount: amount.toNumber(),
      // node_id: comment.node_id,
      // node_type: "IssueComment",
      // node_url: comment.html_url,
      token_id: tokenId,
    };

    const { data: debitInsertData, error: debitError } = await this.supabase
      .from("debits")
      .insert(debitData)
      .select("*")
      .maybeSingle();

    if (debitError) throw new Error(debitError.message);
    if (!debitInsertData) throw new Error("Debit not inserted");

    // Insert into the settlements table
    const settlementData: SettlementInsert = {
      id: debitInsertData.id,
      debit_id: debitInsertData.id,
      user_id: userId,
      location_id: debitInsertData.location_id, // Should be updated by trigger
    };

    const { data: settlementInsertData, error: settlementError } = await this.supabase
      .from("settlements")
      .insert(settlementData)
      .maybeSingle();

    if (settlementError) throw new Error(settlementError.message);
    if (!settlementInsertData) throw new Error("Settlement not inserted");
  }

  public async addCredit({
    userId,
    amount,
    // comment,
    transactionData,
    networkId,
    organization,
  }: AddCreditWithPermit) {
    // Insert into the credits table
    const creditData: CreditInsert = {
      amount: amount.toNumber(),
    };

    const { data: creditInsertData, error: creditError } = await this.supabase
      .from("credits")
      .insert(creditData)
      .select("*")
      .maybeSingle();

    if (creditError) throw new Error(creditError.message);
    if (!creditInsertData) throw new Error("Credit not inserted");

    // Insert into the permits table if permit data is provided
    let permitInsertData;
    if (transactionData) {
      if (!organization) throw new Error("Organization not provided");
      if (!networkId) throw new Error("Network ID not provided");

      const permitData: PermitInsert = {
        amount: transactionData.permit.permitted.amount,
        nonce: transactionData.permit.nonce,
        deadline: transactionData.permit.deadline,
        signature: transactionData.signature,
        token_id: await this._lookupTokenId(networkId, transactionData.permit.permitted.token),
        partner_id: organization.id,
        beneficiary_id: userId,
      };

      const permitResult = await this.supabase.from("permits").insert(permitData).select("*").maybeSingle();

      if (permitResult.error) throw new Error(permitResult.error.message);
      if (!permitResult.data) throw new Error("Permit not inserted");
      permitInsertData = permitResult.data;
    }

    // Update the credits table with permit_id if permit data is provided
    if (permitInsertData) {
      const { error: creditUpdateError } = await this.supabase
        .from("credits")
        .update({ permit_id: permitInsertData.id })
        .eq("id", creditInsertData.id);

      if (creditUpdateError) throw new Error(creditUpdateError.message);
    }

    // Insert into the settlements table
    const settlementData: SettlementInsert = {
      id: creditInsertData.id,
      credit_id: creditInsertData.id,
      user_id: userId,
      location_id: creditInsertData.location_id, // Should be updated by trigger
    };

    const { data: settlementInsertData, error: settlementError } = await this.supabase
      .from("settlements")
      .insert(settlementData)
      .maybeSingle();

    if (settlementError) throw new Error(settlementError.message);
    if (!settlementInsertData) throw new Error("Settlement not inserted");
  }
}
