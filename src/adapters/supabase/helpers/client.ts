import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAdapters, getLogger } from "../../../bindings";
import { Issue, UserProfile } from "../../../types";
import { Database } from "../types";

/**
 * @dev Creates a typescript client which will be used to interact with supabase platform
 *
 * @param url - The supabase project url
 * @param key - The supabase project key
 * @returns - The supabase client
 */
export const supabase = (url: string, key: string): SupabaseClient => {
  return createClient<Database>(url, key);
};

/**
 * @dev Gets the maximum issue number stored in `issues` table
 */
export const getMaxIssueNumber = async (): Promise<number> => {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("issues").select("issue_number").order("issue_number", { ascending: false }).limit(1).single();
  if (data) {
    return Number(data.issue_number);
  } else {
    return 0;
  }
};

/**
 * @dev Gets the last weekly update timestamp
 */
export const getLastWeeklyTime = async (): Promise<number> => {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("weekly").select("last_time").limit(1).single();
  if (data) {
    return Number(data.last_time);
  } else {
    return 0;
  }
};

/**
 * @dev Updates the last weekly update timestamp
 */
export const updateLastWeeklyTime = async (time: number): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();
  const { data, error } = await supabase.from("weekly").update({ last_time: time });
  logger.info(`Updating last time is done, data: ${data}, error: ${error}`);
  return;
};

export type IssueAdditions = {
  labels: {
    timeline: string;
    priority: string;
    price: string;
  };

  started_at?: number;
  completed_at?: number;
};

const getDbDataFromIssue = (issue: Issue, additions: IssueAdditions) => {
  return {
    issue_number: issue.number,
    issue_url: issue.html_url,
    comments_url: issue.comments_url,
    events_url: issue.events_url,
    labels: issue.labels.map((issue) => issue.name),
    assignees: issue.assignees ? issue.assignees.map((assignee) => assignee.login) : [],
    timeline: additions.labels.timeline,
    priority: additions.labels.priority,
    price: additions.labels.price,
    started_at: additions.started_at,
    completed_at: additions.completed_at,
    closed_at: issue.closed_at,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
};

export type UserProfileAdditions = {
  wallet_address?: string;
};
const getDbDataFromUserProfile = (userProfile: UserProfile, additions?: UserProfileAdditions) => {
  return {
    user_login: userProfile.login,
    user_type: userProfile.type,
    user_name: userProfile.name,
    company: userProfile.company,
    blog: userProfile.blog,
    user_location: userProfile.location,
    email: userProfile.email,
    bio: userProfile.bio,
    twitter_username: userProfile.twitter_username,
    public_repos: userProfile.public_repos,
    followers: userProfile.followers,
    following: userProfile.following,
    wallet_address: additions?.wallet_address,
    created_at: userProfile.created_at,
    updated_at: userProfile.updated_at,
  };
};
/**
 * Performs an UPSERT on the issues table.
 * @param issue The issue entity fetched from github event.
 */
export const upsertIssue = async (issue: Issue, additions: IssueAdditions): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();
  const { data, error } = await supabase.from("issues").select("id").eq("issue_number", issue.number).single();

  if (data) {
    const key = data.id as number;
    await supabase
      .from("issues")
      .upsert({ id: key, ...getDbDataFromIssue(issue, additions) })
      .select();
    logger.info(`Upserting an issue done, data: ${data}, error: ${error}`);
  } else if (error) {
    const { data: _data, error: _error } = await supabase.from("issues").insert(getDbDataFromIssue(issue, additions));
    logger.info(`Creating a new issue done, { data: ${_data}, error: ${_error}`);
  }
};

/**
 * Performs an UPSERT on the users table.
 * @param user The user entity fetched from github event.
 */
export const upsertUser = async (user: UserProfile): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();
  const { data, error } = await supabase.from("users").select("id").eq("user_login", user.login).single();

  if (data) {
    const key = data.id as number;
    await supabase
      .from("users")
      .upsert({ id: key, ...getDbDataFromUserProfile(user) })
      .select();
    logger.info(`Upserting an user done", { data: ${data}, error: ${error} }`);
  } else if (error) {
    const { data: _data, error: _error } = await supabase.from("users").insert(getDbDataFromUserProfile(user));
    logger.info(`Creating a new user done", { data: ${_data}, error: ${_error} }`);
  }
};

/**
 * Performs an UPSERT on the wallet table.
 * @param username The user name you want to upsert a wallet address for
 * @param address The account address
 */
export const upsertWalletAddress = async (username: string, address: string): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("wallets").select("user_name").eq("user_name", username).single();
  if (data) {
    await supabase.from("wallets").upsert({
      user_name: username,
      wallet_address: address,
      updated_at: new Date().toUTCString(),
    });
    logger.info(`Upserting a wallet address done, { data: ${data}, error: ${error} }`);
  } else {
    const { data: _data, error: _error } = await supabase.from("wallets").insert({
      user_name: username,
      wallet_address: address,
      created_at: new Date().toUTCString(),
      updated_at: new Date().toUTCString(),
    });
    logger.info(`Creating a new wallet_table record done, { data: ${_data}, error: ${_error} }`);
  }
};

/**
 * Performs an UPSERT on the wallet table.
 * @param username The user name you want to upsert a wallet address for
 * @param address The account multiplier
 */
export const upsertWalletMultiplier = async (username: string, multiplier: string, reason: string): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("wallets").select("user_name").eq("user_name", username).single();
  if (data) {
    await supabase.from("wallets").upsert({
      user_name: username,
      multiplier,
      reason,
      updated_at: new Date().toUTCString(),
    });
    logger.info(`Upserting a wallet address done, { data: ${data}, error: ${error} }`);
  } else {
    const { data: _data, error: _error } = await supabase.from("wallets").insert({
      user_name: username,
      wallet_address: "",
      multiplier,
      reason,
      created_at: new Date().toUTCString(),
      updated_at: new Date().toUTCString(),
    });
    logger.info(`Creating a new wallet_table record done, { data: ${_data}, error: ${_error} }`);
  }
};

/**
 * Performs an UPSERT on the access table.
 * @param username The user name you want to upsert a wallet address for
 * @param repository The repository for access
 * @param access Access granting
 * @param bool Disabling or enabling
 */
export const upsertAccessControl = async (username: string, repository: string, access: string, bool: boolean): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("access").select("user_name").eq("user_name", username).eq("repository", repository).single();

  const properties = {
    user_name: username,
    repository: repository,
    updated_at: new Date().toUTCString(),
    [access]: bool,
  };

  if (data) {
    await supabase.from("access").upsert(properties);
    logger.info(`Upserting an access done, { data: ${data}, error: ${error} }`);
  } else {
    const { data: _data, error: _error } = await supabase.from("access").insert({
      created_at: new Date().toUTCString(),
      price_access: false,
      time_access: false,
      multiplier_access: false,
      priority_access: false,
      ...properties,
    });
    logger.info(`Creating a new access record done, { data: ${_data}, error: ${_error} }`);
  }
};

export const getAccessLevel = async (username: string, repository: string, label_type: string): Promise<boolean> => {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data } = await supabase.from("access").select("*").eq("user_name", username).eq("repository", repository).single();

  if (!data || !data[`${label_type}_access`]) {
    logger.info(`Access not found on the database`);
    // no access
    return false;
  }

  const accessValues = data[`${label_type}_access`];

  return accessValues;
};

/**
 * Queries the wallet address registered previously
 *
 * @param username The username you want to find an address for
 * @returns The ERC20 address
 */
export const getWalletAddress = async (username: string): Promise<string | undefined> => {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("wallets").select("wallet_address").eq("user_name", username).single();
  return data?.wallet_address;
};

/**
 * Queries the wallet multiplier registered previously
 *
 * @param username The username you want to find an address for
 * @returns The Multiplier, returns 1 if not found
 *
 */

export const getWalletMultiplier = async (username: string): Promise<number> => {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("wallets").select("multiplier").eq("user_name", username).single();
  if (data?.multiplier == null) return 1;
  else return data?.multiplier;
};

/**
 * Queries both the wallet multiplier and address in one request registered previously
 *
 * @param username The username you want to find an address for
 * @returns The Multiplier and ERC-20 Address, returns 1 if not found
 *
 */

export const getWalletInfo = async (username: string): Promise<{ multiplier: number | null; address: string | null } | number | undefined> => {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("wallets").select("multiplier, address").eq("user_name", username).single();
  if (data?.multiplier == null || data?.address == null) return 1;
  else return { multiplier: data?.multiplier, address: data?.address };
};

export const getMultiplierReason = async (username: string): Promise<string> => {
  const { supabase } = getAdapters();
  const { data } = await supabase.from("wallets").select("reason").eq("user_name", username).single();
  return data?.reason;
};
