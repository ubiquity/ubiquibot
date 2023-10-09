import { SupabaseClient } from "@supabase/supabase-js";
import { Context } from "probot/lib/context";
import Runtime from "../../../../bindings/bot-runtime";
import { User } from "../../../../types";
import { Database } from "../../types/database";
import { Super } from "./super";
import { UserInsert, UserRow } from "./user";

export type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletInsert = Database["public"]["Tables"]["wallets"]["Insert"];
type UserWithWallet = (UserRow & { wallets: WalletRow | null })[];

type issueCommentPayload = Context<"issue_comment.created">["payload"] | Context<"issue_comment.edited">["payload"];

export class Wallet extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
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

    const { data, error } = await this.supabase.from("locations").select("*").eq("id", locationId);
    if (error) throw error;
    const nodeUrl = data[0].node_url;
    if (!nodeUrl) throw new Error("Node URL of wallet registration comment is null");

    return nodeUrl;
  }

  public async upsertWalletAddress(address: string): Promise<void> {
    const runtime = Runtime.getState();
    const eventContext = runtime.eventContext;
    const payload = eventContext.payload as
      | Context<"issue_comment.created">["payload"]
      | Context<"issue_comment.edited">["payload"];

    // Check if the user exists
    const userResponse = await this._checkIfUserExists(payload.sender.id);

    let userData = userResponse.data as UserRow;
    const userError = userResponse.error;

    if (userError) throw userError;

    // If user doesn't exist, register the user
    if (!userData) {
      const user = payload.sender as User;
      userData = await this._registerNewUser(user);
    }

    // Check if the wallet exists by looking up the wallet_id foreign key
    const walletResponse = await this._checkIfWalletExists(userData);
    const walletData = walletResponse.data as WalletRow;
    const walletError = walletResponse.error;

    if (walletError) throw walletError;

    const locationMetaData = {
      user_id: payload.sender.id,
      comment_id: payload.comment.id,
      issue_id: payload.issue.id,
      repository_id: payload.repository.id,
      organization_id: payload.organization?.id ?? payload.repository.owner.id,
      // comment: payload.comment,
    } as LocationMetaData;

    // If wallet doesn't exist, insert a new row
    if (!walletData) {
      await this._registerNewWallet({
        address,
        locationMetaData,
        payload,
      });
    } else {
      // Update the existing wallet
      await this._updateExistingWallet({
        address,
        locationMetaData,
        payload,
        walletData,
      });
    }
  }

  private async _getUserWithWallet(id: number): Promise<UserWithWallet> {
    const { data, error } = await this.supabase.from("users").select("*, wallets(*)").filter("id", "eq", id);
    if (error) throw error;
    return data;
  }

  private async _checkIfUserExists(userId: number) {
    return await this.supabase.from("users").select("*").eq("id", userId).single();
  }

  private async _registerNewUser(user: User) {
    const newUser: UserInsert = {
      id: user.id,
      node_id: user.node_id,
      node_type: "User",
      node_url: user.html_url,
    };

    const { data: newUserInsertData, error: newUserError } = await this.supabase.from("users").insert(newUser).single();

    if (newUserError) throw newUserError;
    return newUserInsertData;
  }

  private async _checkIfWalletExists(userData: UserRow) {
    return await this.supabase.from("wallets").select("*").eq("id", userData.wallet_id).single();
  }

  private async _registerNewWallet({ address, locationMetaData, payload }: RegisterNewWallet) {
    const newWallet: WalletInsert = {
      address: address,
      node_id: payload.comment.node_id,
      node_type: "IssueComment",
      node_url: payload.comment.html_url,
    };

    const { data: walletInsertData, error: walletInsertError } = await this.supabase
      .from("wallets")
      .insert(newWallet)
      .single();

    if (walletInsertError) throw walletInsertError;

    // Update wallet_id in users table
    const senderId = payload.sender.id;
    const walletData = walletInsertData as WalletRow;

    await this._updateWalletId(walletData.id, senderId);

    if (walletData.location_id) {
      await this._enrichLocationMetaData(walletData, locationMetaData);
    }
  }

  private async _updateWalletId(walletId: number, userId: number) {
    await this.supabase.from("users").update({ wallet_id: walletId }).eq("id", userId);
  }

  private async _updateExistingWallet({ address, locationMetaData, payload, walletData }: UpdateExistingWallet) {
    const basicLocationInfo = {
      address: address,
      node_id: payload.comment.node_id,
      node_type: "IssueComment",
      node_url: payload.comment.html_url,
    } as WalletRow;

    await this.supabase.from("wallets").update(basicLocationInfo).eq("id", walletData.id).single();

    if (walletData.location_id) {
      await this._enrichLocationMetaData(walletData, locationMetaData);
    }
  }

  private async _enrichLocationMetaData(walletData: WalletRow, locationMetaData: LocationMetaData) {
    const runtime = Runtime.getState();
    const logger = runtime.logger;
    logger.ok("Enriching wallet location metadata", locationMetaData);
    await this.supabase.from("locations").update(locationMetaData).eq("id", walletData.location_id);
  }
}

interface RegisterNewWallet {
  address: string;
  payload: issueCommentPayload;
  locationMetaData: LocationMetaData;
}

interface UpdateExistingWallet extends RegisterNewWallet {
  walletData: WalletRow;
}

interface LocationMetaData {
  user_id: number;
  comment_id: number;
  issue_id: number;
  repository_id: number;
  organization_id: number;
}
