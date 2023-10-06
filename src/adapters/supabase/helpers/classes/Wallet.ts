import { SupabaseClient } from "@supabase/supabase-js";
import { Comment, User } from "../../../../types";
import { Database } from "../../types/database";
import { Super } from "./Super";
import { UserInsert, UserRow } from "./User";

export type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletInsert = Database["public"]["Tables"]["wallets"]["Insert"];
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

  public async upsertWalletAddress(address: string, nodes: { user: User; comment: Comment }): Promise<void> {
    // Check if the user exists
    const userResponse = await this._checkIfUserExists(nodes.user.id);

    let userData = userResponse.data;
    const userError = userResponse.error;

    if (userError) throw userError;

    // If user doesn't exist, register the user
    if (!userData) {
      userData = await this._registerNewUser(nodes.user, userData);
    }

    // Check if the wallet exists by looking up the wallet_id foreign key
    const walletResponse = await this._checkIfWalletExists(userData);
    let walletData = walletResponse.data;
    const walletError = walletResponse.error;

    if (walletError) throw walletError;

    // If wallet doesn't exist, insert a new row
    if (!walletData) {
      walletData = await this._registerNewWallet(address, nodes.comment, walletData, nodes.user.id);
    } else {
      // Update the existing wallet
      await this._updateExistingWallet(address, userData);
    }
  }

  private async _checkIfUserExists(userId: number) {
    return await this.client.from("users").select("*").eq("id", userId).single();
  }

  private async _registerNewUser(user: User, userData: UserRow) {
    const newUser: UserInsert = {
      id: user.id,
      node_id: user.node_id,
      node_type: "User",
      node_url: user.html_url,
    };

    const { data: newUserInsertData, error: newUserError } = await this.client.from("users").insert(newUser).single();

    if (newUserError) throw newUserError;
    userData = newUserInsertData;
    return userData;
  }

  private async _checkIfWalletExists(userData: UserRow) {
    return await this.client.from("wallets").select("*").eq("id", userData.wallet_id).single();
  }

  private async _registerNewWallet(address: string, comment: Comment, walletData: WalletRow, userId: number) {
    const newWallet: WalletInsert = {
      address: address,
      node_id: comment.node_id,
      node_type: "IssueComment",
      node_url: comment.html_url,
    };

    const { data: walletInsertData, error: walletInsertError } = await this.client
      .from("wallets")
      .insert(newWallet)
      .single();

    if (walletInsertError) throw walletInsertError;
    walletData = walletInsertData;

    // Update wallet_id in users table
    await this._updateWalletId(walletData, userId);
    return walletData;
  }

  private async _updateWalletId(walletData: WalletRow, userId: number) {
    await this.client.from("users").update({ wallet_id: walletData.id }).eq("id", userId);
  }

  private async _updateExistingWallet(address: string, userData: UserRow) {
    await this.client.from("wallets").update({ address: address }).eq("id", userData.wallet_id);
  }
}
