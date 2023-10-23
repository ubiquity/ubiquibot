import { SupabaseClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import { GeneratedPermit } from "../../../../helpers/permit";
import { Comment, Payload } from "../../../../types/payload";
import { Database } from "../../types/database";
import { Super } from "./super";
import { Context } from "../../../../types";

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
  permit?: GeneratedPermit;
  networkId?: number;
  organization?: Payload["organization"];
};

export class Settlement extends Super {
  constructor(supabase: SupabaseClient, context: Context) {
    super(supabase, context);
  }

  private async _lookupTokenId(networkId: number, address: string): Promise<number> {
    const { data: tokenData, error: tokenError } = await this.supabase
      .from("tokens")
      .select("id")
      .eq("network", networkId)
      .eq("address", address)
      .single();

    if (tokenError) throw tokenError;
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
      .single();

    if (debitError) throw debitError;
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
      .single();

    if (settlementError) throw settlementError;
    if (!settlementInsertData) throw new Error("Settlement not inserted");
  }

  public async addCredit({
    userId,
    amount,
    // comment,
    permit,
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
      .single();

    if (creditError) throw creditError;
    if (!creditInsertData) throw new Error("Credit not inserted");

    // Insert into the permits table if permit data is provided
    let permitInsertData;
    if (permit) {
      if (!organization) throw new Error("Organization not provided");
      if (!networkId) throw new Error("Network ID not provided");

      const permitData: PermitInsert = {
        amount: permit.permit.permitted.amount,
        nonce: permit.permit.nonce,
        deadline: permit.permit.deadline,
        signature: permit.signature,
        token_id: await this._lookupTokenId(networkId, permit.permit.permitted.token),
        partner_id: organization.id,
        beneficiary_id: userId,
      };

      const permitResult = await this.supabase.from("permits").insert(permitData).select("*").single();

      if (permitResult.error) throw permitResult.error;
      if (!permitResult.data) throw new Error("Permit not inserted");
      permitInsertData = permitResult.data;
    }

    // Update the credits table with permit_id if permit data is provided
    if (permitInsertData) {
      const { error: creditUpdateError } = await this.supabase
        .from("credits")
        .update({ permit_id: permitInsertData.id })
        .eq("id", creditInsertData.id);

      if (creditUpdateError) throw creditUpdateError;
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
      .single();

    if (settlementError) throw settlementError;
    if (!settlementInsertData) throw new Error("Settlement not inserted");
  }
}
