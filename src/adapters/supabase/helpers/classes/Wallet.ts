import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";
import { Super } from "./Super";
import { UserRow } from "./User";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
// type WalletResponse = WalletRow[] | null;
type UserWithWallet = (UserRow & { wallets: WalletRow | null })[];
export class Wallet extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  private async _getUserWithWallet(id: number): Promise<UserWithWallet> {
    const { data, error } = await this.client.from("users").select("*, wallets(*)").filter("id", "eq", id);
    if (error) throw error;
    return data;
  }

  public async getAddress(id: number): Promise<string> {
    const userWithWallet = await this._getUserWithWallet(id);

    if (userWithWallet[0]?.wallets?.address === undefined) throw new Error("Wallet address is undefined");
    if (userWithWallet[0]?.wallets?.address === null) throw new Error("Wallet address is null");
    return userWithWallet[0]?.wallets?.address;
  }

  public async getWalletRegistrationUrl(id: number): Promise<string> {
    const userWithWallet = await this._getUserWithWallet(id);
    if (!userWithWallet[0].wallets) throw new Error("Wallet of wallet registration comment is null");
    if (!userWithWallet[0].wallets.location_id) throw new Error("Location id of wallet registration comment is null");

    const locationId = userWithWallet[0].wallets.location_id;

    const { data, error } = await this.client.from("locations").select("*").eq("id", locationId);
    if (error) throw error;
    const nodeUrl = data[0].node_url;
    if (!nodeUrl) throw new Error("Node URL of wallet registration comment is null");

    return nodeUrl;
  }
}
