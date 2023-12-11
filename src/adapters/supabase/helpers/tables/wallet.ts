import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { Context as ProbotContext } from "probot";
import Runtime from "../../../../bindings/bot-runtime";
import { User } from "../../../../types/payload";

import { Database } from "../../types/database";
import { Super } from "./super";
import { UserRow } from "./user";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type WalletInsert = Database["public"]["Tables"]["wallets"]["Insert"];
type UserWithWallet = (UserRow & { wallets: WalletRow | null })[];

type IssueCommentPayload =
  | ProbotContext<"issue_comment.created">["payload"]
  | ProbotContext<"issue_comment.edited">["payload"];

export class Wallet extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  public async getAddress(id: number): Promise<string> {
    const userWithWallet = await this._getUserWithWallet(id);
    return this._validateAndGetWalletAddress(userWithWallet);
  }

  public async upsertWalletAddress(context: ProbotContext, address: string) {
    const payload = context.payload as
      | ProbotContext<"issue_comment.created">["payload"]
      | ProbotContext<"issue_comment.edited">["payload"];

    const userData = await this._getUserData(payload);
    const locationMetaData = this._getLocationMetaData(payload);

    if (!userData.wallet_id) {
      await this._registerNewWallet({
        address,
        locationMetaData,
        payload,
      });
    } else {
      const registeredWalletData = await this._getRegisteredWalletData(userData);
      await this._updateExistingWallet({
        address,
        locationMetaData,
        payload,
        walletData: registeredWalletData,
      });
    }
  }

  private async _getUserWithWallet(id: number): Promise<UserWithWallet> {
    const { data, error } = await this.supabase.from("users").select("*, wallets(*)").filter("id", "eq", id);
    if (error) throw error;
    return data;
  }

  private _validateAndGetWalletAddress(userWithWallet: UserWithWallet): string {
    // const payload = Runtime.getState().latestEventContext.payload;

    if (userWithWallet[0]?.wallets?.address === undefined) throw new Error("Wallet address is undefined");
    if (userWithWallet[0]?.wallets?.address === null) throw new Error("Wallet address is null");
    return userWithWallet[0]?.wallets?.address;
  }

  private async _checkIfUserExists(userId: number) {
    const { data, error } = await this.supabase.from("users").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data as UserRow;
  }

  private async _getUserData(payload: IssueCommentPayload): Promise<UserRow> {
    const user = await this._checkIfUserExists(payload.sender.id);
    let userData = user;
    if (!userData) {
      const user = payload.sender as User;
      userData = await this._registerNewUser(user, this._getLocationMetaData(payload));
    }
    return userData;
  }

  private async _registerNewUser(user: User, locationMetaData: LocationMetaData): Promise<UserRow> {
    // Insert the location metadata into the locations table
    const { data: locationData, error: locationError } = (await this.supabase
      .from("locations")
      .insert(locationMetaData)
      .select()
      .single()) as { data: LocationRow; error: PostgrestError | null };

    if (locationError) {
      throw new Error(locationError.message);
    }
    console.log(locationData);
    // Get the ID of the inserted location
    const locationId = locationData.id;

    // Register the new user with the location ID
    const { data: userData, error: userError } = await this.supabase
      .from("users")
      .insert([{ id: user.id, location_id: locationId /* other fields if necessary */ }])
      .select()
      .single();

    if (userError) {
      throw new Error(userError.message);
    }

    return userData as UserRow;
  }

  private async _checkIfWalletExists(
    userData: UserRow
  ): Promise<{ data: WalletRow | null; error: PostgrestError | null }> {
    const { data, error } = await this.supabase.from("wallets").select("*").eq("id", userData.wallet_id).maybeSingle();

    return { data: data as WalletRow, error };
  }

  private async _updateWalletId(walletId: number, userId: number) {
    const { error } = await this.supabase.from("users").update({ wallet_id: walletId }).eq("id", userId);

    if (error) {
      throw error;
    }
  }

  private async _getRegisteredWalletData(userData: UserRow): Promise<WalletRow> {
    const walletResponse = await this._checkIfWalletExists(userData);
    const walletData = walletResponse.data as WalletRow;
    const walletError = walletResponse.error;

    if (walletError) throw walletError;
    return walletData;
  }

  private _getLocationMetaData(payload: IssueCommentPayload): LocationMetaData {
    return {
      user_id: payload.sender.id,
      comment_id: payload.comment.id,
      issue_id: payload.issue.id,
      repository_id: payload.repository.id,
      organization_id: payload.organization?.id ?? payload.repository.owner.id,
    } as LocationMetaData;
  }

  private async _registerNewWallet({ address, locationMetaData, payload }: RegisterNewWallet) {
    const walletData = await this._insertNewWallet(address);
    await this._updateWalletId(walletData.id, payload.sender.id);
    if (walletData.location_id) {
      await this._enrichLocationMetaData(walletData, locationMetaData);
    }
  }

  private async _updateExistingWallet({ address, locationMetaData, walletData }: UpdateExistingWallet) {
    await this._updateWalletAddress(walletData.id, address);
    if (walletData.location_id) {
      await this._enrichLocationMetaData(walletData, locationMetaData);
    }
  }

  private async _insertNewWallet(address: string): Promise<WalletRow> {
    const newWallet: WalletInsert = {
      address: address,
    };

    const { data: walletInsertData, error: walletInsertError } = await this.supabase
      .from("wallets")
      .insert(newWallet)
      .select()
      .single();

    if (walletInsertError) throw walletInsertError;
    return walletInsertData as WalletRow;
  }

  private async _updateWalletAddress(walletId: number, address: string) {
    const basicLocationInfo = {
      address: address,
    } as WalletRow;

    await this.supabase.from("wallets").update(basicLocationInfo).eq("id", walletId).maybeSingle();
  }

  private async _enrichLocationMetaData(walletData: WalletRow, locationMetaData: LocationMetaData) {
    const runtime = Runtime.getState();
    const logger = runtime.logger;
    logger.ok("Enriching wallet location metadata", locationMetaData);
    return await this.supabase.from("locations").update(locationMetaData).eq("id", walletData.location_id);
  }
}

interface RegisterNewWallet {
  address: string;
  payload: IssueCommentPayload;
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
