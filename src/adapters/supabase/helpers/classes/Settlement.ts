import { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
import { Super } from "./Super";
import { WalletRow } from "./Wallet";

export class Settlement extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
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

  // public async getChanges(labels: string[], node: GitHubNode, userId: number) {
  //   // const response = await this.client
  //   //   .from("labels")
  //   //   .select("*")
  //   //   .in("label_to", labels)
  //   //   .eq("repository", repository)
  //   //   .eq("authorized", false);
  // }

  // private async _getRepositoryLocationId(repository: string): Promise<number> {
  //   const { data, error } = await this.client.from("locations").select("location_id").eq("name", repository);
  //   if (error) throw error;
  //   return data[0].location_id;
  // }
}
