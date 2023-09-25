import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAdapters, getLogger } from "../../../bindings";
import { Issue, UserProfile } from "../../../types";
import { Database } from "../types";
import { InsertPermit, Permit } from "../../../helpers";
import { BigNumber, BigNumberish } from "ethers";

interface AccessLevels {
  multiplier: boolean;
  price: boolean;
  priority: boolean;
  time: boolean;
}

/**
 * @dev Creates a typescript client which will be used to interact with supabase platform
 *
 * @param url - The supabase project url
 * @param key - The supabase project key
 * @returns - The supabase client
 */
export const supabase = (url: string, key: string): SupabaseClient => {
  return createClient<Database>(url, key, { auth: { persistSession: false } });
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
export const getLastWeeklyTime = async (): Promise<Date | undefined> => {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("weekly").select("last_time").limit(1).single();
  if (data) {
    return new Date(data.last_time);
  } else {
    return undefined;
  }
};

/**
 * @dev Updates the last weekly update timestamp
 */
export const updateLastWeeklyTime = async (time: Date): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("weekly").select("last_time");
  if (error) {
    logger.error(`Checking last time failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking last time failed, error: ${JSON.stringify(error)}`);
  }

  if (data && data.length > 0) {
    const { data, error } = await supabase.from("weekly").update({ last_time: time.toUTCString() }).neq("last_time", time.toUTCString());
    if (error) {
      logger.error(`Updating last time failed, error: ${JSON.stringify(error)}`);
      throw new Error(`Updating last time failed, error: ${JSON.stringify(error)}`);
    }
    logger.info(`Updating last time is done, data: ${data}`);
  } else {
    const { data, error } = await supabase.from("weekly").insert({ last_time: time.toUTCString() });
    if (error) {
      logger.error(`Creating last time failed, error: ${JSON.stringify(error)}`);
      throw new Error(`Creating last time failed, error: ${JSON.stringify(error)}`);
    }
    logger.info(`Creating last time is done, data: ${data}`);
  }
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
    user_name: userProfile.name ?? userProfile.login,
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
  const { data, error } = await supabase.from("issues").select("id").eq("issue_number", issue.number);
  if (error) {
    logger.error(`Checking issue failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking issue failed, error: ${JSON.stringify(error)}`);
  }

  if (data && data.length > 0) {
    const key = data[0].id as number;
    const { data: _data, error: _error } = await supabase
      .from("issues")
      .upsert({ id: key, ...getDbDataFromIssue(issue, additions) })
      .select();
    if (_error) {
      logger.error(`Upserting an issue failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Upserting an issue failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Upserting an issue done, { data: ${_data}, error: ${_error}`);
  } else {
    const { data: _data, error: _error } = await supabase.from("issues").insert(getDbDataFromIssue(issue, additions));
    if (_error) {
      logger.error(`Creating a new issue record failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Creating a new issue record failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Creating a new issue record done, { data: ${_data}, error: ${_error}`);
  }
};

/**
 * Performs an UPSERT on the users table.
 * @param user The user entity fetched from github event.
 */
export const upsertUser = async (user: UserProfile): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();
  const { data, error } = await supabase.from("users").select("user_login").eq("user_login", user.login);
  if (error) {
    logger.error(`Checking user failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking user failed, error: ${JSON.stringify(error)}`);
  }

  if (data && data.length > 0) {
    const { data: _data, error: _error } = await supabase.from("users").upsert(getDbDataFromUserProfile(user)).select();
    if (_error) {
      logger.error(`Upserting a user failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Upserting a user failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Upserting a user done, { data: ${JSON.stringify(_data)} }`);
  } else {
    const { data: _data, error: _error } = await supabase.from("users").insert(getDbDataFromUserProfile(user));
    if (_error) {
      logger.error(`Creating a new user record failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Creating a new user record failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Creating a new user record done, { data: ${JSON.stringify(_data)} }`);
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

  const { data, error } = await supabase.from("wallets").select("user_name").eq("user_name", username);
  if (error) {
    logger.error(`Checking wallet address failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking wallet address failed, error: ${JSON.stringify(error)}`);
  }

  if (data && data.length > 0) {
    const { data: _data, error: _error } = await supabase.from("wallets").upsert({
      user_name: username,
      wallet_address: address,
      updated_at: new Date().toUTCString(),
    });
    if (_error) {
      logger.error(`Upserting a wallet address failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Upserting a wallet address failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Upserting a wallet address done, { data: ${JSON.stringify(_data)} }`);
  } else {
    const { error } = await supabase.from("wallets").insert({
      user_name: username,
      wallet_address: address,
      created_at: new Date().toUTCString(),
      updated_at: new Date().toUTCString(),
    });
    if (error) {
      logger.error(`Creating a new wallet_table record failed, error: ${JSON.stringify(error)}`);
      throw new Error(`Creating a new wallet_table record failed, error: ${JSON.stringify(error)}`);
    }
    logger.info(`Creating a new wallet_table record done, { data: ${JSON.stringify(data)}, address: $address }`);
  }
};

/**
 * Performs an UPSERT on the multiplier table.
 * @param username The user name you want to upsert a wallet address for
 * @param address The account multiplier
 */
export const upsertWalletMultiplier = async (username: string, multiplier: string, reason: string, org_id: string): Promise<void> => {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("multiplier").select("user_id").eq("user_id", `${username}_${org_id}`);
  if (error) {
    logger.error(`Checking wallet multiplier failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking wallet multiplier failed, error: ${JSON.stringify(error)}`);
  }

  if (data && data.length > 0) {
    const { data: _data, error: _error } = await supabase.from("multiplier").upsert({
      user_id: `${username}_${org_id}`,
      value: multiplier,
      reason,
      updated_at: new Date().toUTCString(),
    });
    if (_error) {
      logger.error(`Upserting a wallet multiplier failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Upserting a wallet multiplier failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Upserting a wallet multiplier done, { data: ${JSON.stringify(_data)} }`);
  } else {
    const { data: _data, error: _error } = await supabase.from("multiplier").insert({
      user_id: `${username}_${org_id}`,
      value: multiplier,
      reason,
      created_at: new Date().toUTCString(),
      updated_at: new Date().toUTCString(),
    });
    if (_error) {
      logger.error(`Creating a new multiplier record failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Creating a new multiplier record failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Creating a new multiplier record done, { data: ${JSON.stringify(_data)} }`);
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

  const { data, error } = await supabase.from("access").select("user_name").eq("user_name", username).eq("repository", repository);
  if (error) {
    logger.error(`Checking access control failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking access control failed, error: ${JSON.stringify(error)}`);
  }

  const properties = {
    user_name: username,
    repository: repository,
    updated_at: new Date().toUTCString(),
    [access]: bool,
  };

  if (data && data.length > 0) {
    const { data: _data, error: _error } = await supabase.from("access").upsert(properties);
    if (_error) {
      logger.error(`Upserting a access control failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Upserting a access control failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Upserting a access control done, { data: ${JSON.stringify(_data)} }`);
  } else {
    const { data: _data, error: _error } = await supabase.from("access").insert({
      created_at: new Date().toUTCString(),
      price_access: false,
      time_access: true,
      multiplier_access: false,
      priority_access: false,
      ...properties,
    });
    if (_error) {
      logger.error(`Creating a new access control record failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Creating a new access control record failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Creating a new access control record done, { data: ${JSON.stringify(_data)} }`);
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

export const getAllAccessLevels = async (username: string, repository: string): Promise<null | AccessLevels> => {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data } = await supabase.from("access").select("*").eq("user_name", username).eq("repository", repository).single();

  if (!data) {
    logger.info(`Access not found on the database`);
    // no access
    return null;
  }
  return { multiplier: data.multiplier_access, time: data.time_access, priority: data.priority_access, price: data.price_access };
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

export const getWalletMultiplier = async (username: string, org_id: string): Promise<{ value: number; reason: string }> => {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("multiplier").select("value, reason").eq("user_id", `${username}_${org_id}`).single();
  if (data?.value == null) return { value: 1, reason: "" };
  else return { value: data?.value, reason: data?.reason };
};

/**
 * Queries both the wallet multiplier and address in one request registered previously
 *
 * @param username The username you want to find an address for
 * @returns The Multiplier and ERC-20 Address, returns 1 if not found
 *
 */

export const getWalletInfo = async (username: string, org_id: string): Promise<{ multiplier: number | null; address: string | null }> => {
  const { supabase } = getAdapters();

  const { data: wallet } = await supabase.from("wallets").select("wallet_address").eq("user_name", username).single();
  const { data: multiplier } = await supabase.from("multiplier").select("value").eq("user_id", `${username}_${org_id}`).single();
  if (multiplier?.value == null) {
    return { multiplier: 1, address: wallet?.wallet_address || "" };
  } else return { multiplier: multiplier?.value, address: wallet?.wallet_address };
};

export const addPenalty = async (username: string, repoName: string, tokenAddress: string, networkId: string, penalty: BigNumberish): Promise<void> => {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { error } = await supabase.rpc("add_penalty", {
    _username: username,
    _repository_name: repoName,
    _token_address: tokenAddress,
    _network_id: networkId,
    _penalty_amount: penalty.toString(),
  });
  logger.debug(`Adding penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error adding penalty: ${error.message}`);
  }
};

export const getPenalty = async (username: string, repoName: string, tokenAddress: string, networkId: string): Promise<BigNumber> => {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { data, error } = await supabase
    .from("penalty")
    .select("amount")
    .eq("username", username)
    .eq("repository_name", repoName)
    .eq("network_id", networkId)
    .eq("token_address", tokenAddress);
  logger.debug(`Getting penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error getting penalty: ${error.message}`);
  }

  if (data.length === 0) {
    return BigNumber.from(0);
  }
  return BigNumber.from(data[0].amount);
};

export const removePenalty = async (username: string, repoName: string, tokenAddress: string, networkId: string, penalty: BigNumberish): Promise<void> => {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { error } = await supabase.rpc("remove_penalty", {
    _username: username,
    _repository_name: repoName,
    _network_id: networkId,
    _token_address: tokenAddress,
    _penalty_amount: penalty.toString(),
  });
  logger.debug(`Removing penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error removing penalty: ${error.message}`);
  }
};

const getDbDataFromPermit = (permit: InsertPermit): Record<string, unknown> => {
  return {
    organization_id: permit.organizationId,
    repository_id: permit.repositoryId,
    issue_id: permit.issueId,
    network_id: permit.networkId,
    bounty_hunter_id: permit.bountyHunterId,
    token_address: permit.tokenAddress,
    payout_amount: permit.payoutAmount,
    bounty_hunter_address: permit.bountyHunterAddress,
    nonce: permit.nonce,
    deadline: permit.deadline,
    signature: permit.signature,
    wallet_owner_address: permit.walletOwnerAddress,
  };
};

const getPermitFromDbData = (data: Record<string, unknown>): Permit => {
  return {
    id: data.id,
    createdAt: new Date(Date.parse(data.created_at as string)),
    organizationId: data.organization_id,
    repositoryId: data.repository_i,
    issueId: data.issue_id,
    networkId: data.network_id,
    bountyHunterId: data.bounty_hunter_id,
    tokenAddress: data.token_address,
    payoutAmount: data.payout_amount,
    bountyHunterAddress: data.bounty_hunter_address,
    nonce: data.nonce,
    deadline: data.deadline,
    signature: data.signature,
    walletOwnerAddress: data.wallet_owner_address,
  } as Permit;
};

export const savePermit = async (permit: InsertPermit): Promise<Permit> => {
  const { supabase } = getAdapters();
  const { data, error } = await supabase
    .from("permits")
    .insert({
      ...getDbDataFromPermit(permit),
      created_at: new Date().toISOString(),
      id: undefined, // id is auto-generated
    })
    .select();
  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error("No data returned");
  }
  return getPermitFromDbData(data[0]);
};

export const saveLabelChange = async (username: string, repository: string, label_from: string, label_to: string, hasAccess: boolean) => {
  const { supabase } = getAdapters();
  const { data, error } = await supabase
    .from("label_changes")
    .insert({
      username,
      repository,
      label_from,
      label_to,
      approved: hasAccess || false,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })
    .select();
  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error("No data returned");
  }
  return data[0];
};

export const getLabelChanges = async (repository: string, labels: string[]) => {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { data, error } = await supabase.from("label_changes").select("*").in("label_to", labels).eq("repository", repository).eq("approved", false);

  logger.debug(`Getting label changes done, { data: ${JSON.stringify(data)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error getting label changes: ${error.message}`);
  }

  if (data.length === 0) {
    return null;
  }
  return data[0];
};

export const _approveLabelChange = async (changeId: number) => {
  const { supabase } = getAdapters();
  const { error } = await supabase.from("label_changes").update({ approved: true }).eq("id", changeId);

  if (error) {
    throw new Error(error.message);
  }

  return;
};
