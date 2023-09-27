import { getAdapters, getLogger } from "../../../bindings";
import { InsertPermit, Permit } from "../../../helpers";
import { BigNumber, BigNumberish } from "ethers";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";

interface AccessLevels {
  multiplier: boolean;
  price: boolean;
  priority: boolean;
  time: boolean;
}

export function generateSupabase(url: string, key: string) {
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

/**
 * @dev Gets the maximum issue number stored in `issues` table
 */
export async function getMaxIssueNumber(): Promise<number> {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("issues").select("issue_number").order("issue_number", { ascending: false }).limit(1).single();
  if (data) {
    return Number(data.issue_number);
  } else {
    return 0;
  }
}

export type IssueAdditions = {
  labels: {
    timeline: string;
    priority: string;
    price: string;
  };

  started_at?: number;
  completed_at?: number;
};

export type UserProfileAdditions = {
  wallet_address?: string;
};

/**
 * Performs an UPSERT on the wallet table.
 * @param username The user name you want to upsert a wallet address for
 * @param address The account address
 */
export async function upsertWalletAddress(username: string, address: string, node_id: string): Promise<void> {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("wallets").select("user_name").eq("user_name", username);
  if (error) {
    logger.error(`Checking wallet address failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking wallet address failed, error: ${JSON.stringify(error)}`);
  }

  if (data && data.length > 0) {
    const { data: _data, error: _error } = await supabase.from("wallets").upsert({
      node_type: "comment",
      node_id: node_id,
      address: address,
      // user_name: username,
      // wallet_address: address,
      // updated_at: new Date().toUTCString(),
    });
    if (_error) {
      logger.error(`Upserting a wallet address failed, error: ${JSON.stringify(_error)}`);
      throw new Error(`Upserting a wallet address failed, error: ${JSON.stringify(_error)}`);
    }
    logger.info(`Upserting a wallet address done, { data: ${JSON.stringify(_data)} }`);
  } else {
    const { error } = await supabase.from("wallets").insert({
      // user_name: username,
      // wallet_address: address,
      // created_at: new Date().toUTCString(),
      // updated_at: new Date().toUTCString(),
    });
    if (error) {
      logger.error(`Creating a new wallet_table record failed, error: ${JSON.stringify(error)}`);
      throw new Error(`Creating a new wallet_table record failed, error: ${JSON.stringify(error)}`);
    }
    logger.info(`Creating a new wallet_table record done, { data: ${JSON.stringify(data)}, address: $address }`);
  }
}

/**
 * Performs an UPSERT on the multiplier table.
 * @param username The user name you want to upsert a wallet address for
 * @param address The account multiplier
 */
export async function upsertWalletMultiplier(username: string, multiplier: string, reason: string, org_id: string): Promise<void> {
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
}

/**
 * Performs an UPSERT on the access table.
 * @param username The user name you want to upsert a wallet address for
 * @param repository The repository for access
 * @param access Access granting
 * @param bool Disabling or enabling
 */
export async function upsertAccessControl(username: string, repository: string, access: string, bool: boolean): Promise<void> {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("access").select("user_name").eq("user_name", username).eq("repository", repository);
  if (error) {
    logger.error(`Checking access control failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking access control failed, error: ${JSON.stringify(error)}`);
  }

  const properties = {
    node_type: "user",
    node_id: user_id,
    labels: { time: false, priority: false, price: false, multiplier: false },
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
}

export async function getAccessLevel(username: string, repository: string, label_type: string): Promise<boolean> {
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
}

export async function getAllAccessLevels(username: string, repository: string): Promise<AccessLevels | null> {
  const logger = getLogger();
  const { supabase } = getAdapters();

  const { data, error } = await supabase.from("access").select("*").eq("user_name", username).eq("repository", repository);
  if (error) {
    logger.error(`Checking access control failed, error: ${JSON.stringify(error)}`);
    throw new Error(`Checking access control failed, error: ${JSON.stringify(error)}`);
  }
  if (!data || data.length === 0) {
    return null;
  }
  return { multiplier: data[0].multiplier_access, time: data[0].time_access, priority: data[0].priority_access, price: data[0].price_access };
}

/**
 * Queries the wallet address registered previously
 *
 * @param username The username you want to find an address for
 * @returns The ERC20 address
 */
export async function getWalletAddress(username: string): Promise<string | undefined> {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("wallets").select("wallet_address").eq("user_name", username).single();
  return data?.wallet_address;
}

/**
 * Queries the wallet multiplier registered previously
 *
 * @param username The username you want to find an address for
 * @returns The Multiplier, returns 1 if not found
 *
 */

export async function getWalletMultiplier(username: string, org_id: string): Promise<{ value: number; reason: string }> {
  const { supabase } = getAdapters();

  const { data } = await supabase.from("multiplier").select("value, reason").eq("user_id", `${username}_${org_id}`).single();
  if (data?.value == null) return { value: 1, reason: "" };
  else return { value: data?.value, reason: data?.reason };
}

/**
 * Queries both the wallet multiplier and address in one request registered previously
 *
 * @param username The username you want to find an address for
 * @returns The Multiplier and ERC-20 Address, returns 1 if not found
 *
 */

export async function getWalletInfo(username: string, org_id: string): Promise<{ multiplier: number | null; address: string | null }> {
  const { supabase } = getAdapters();

  const { data: wallet } = await supabase.from("wallets").select("wallet_address").eq("user_name", username).single();
  const { data: multiplier } = await supabase.from("multiplier").select("value").eq("user_id", `${username}_${org_id}`).single();
  if (multiplier?.value == null) {
    return { multiplier: 1, address: wallet?.wallet_address || "" };
  } else return { multiplier: multiplier?.value, address: wallet?.wallet_address };
}

export async function addPenalty(username: string, repoName: string, tokenAddress: string, evmNetworkId: string, penalty: BigNumberish): Promise<void> {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { error } = await supabase.rpc("add_penalty", {
    _username: username,
    _repository_name: repoName,
    _token_address: tokenAddress,
    _network_id: evmNetworkId,
    _penalty_amount: penalty.toString(),
  });
  logger.debug(`Adding penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error adding penalty: ${error.message}`);
  }
}

export async function getPenalty(username: string, repoName: string, tokenAddress: string, evmNetworkId: string): Promise<BigNumber> {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { data, error } = await supabase
    .from("penalty")
    .select("amount")
    .eq("username", username)
    .eq("repository_name", repoName)
    .eq("evm_network_id", evmNetworkId)
    .eq("token_address", tokenAddress);
  logger.debug(`Getting penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error getting penalty: ${error.message}`);
  }

  if (data.length === 0) {
    return BigNumber.from(0);
  }
  return BigNumber.from(data[0].amount);
}

export async function removePenalty(username: string, repoName: string, tokenAddress: string, evmNetworkId: string, penalty: BigNumberish): Promise<void> {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { error } = await supabase.rpc("remove_penalty", {
    _username: username,
    _repository_name: repoName,
    _network_id: evmNetworkId,
    _token_address: tokenAddress,
    _penalty_amount: penalty.toString(),
  });
  logger.debug(`Removing penalty done, { data: ${JSON.stringify(error)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error removing penalty: ${error.message}`);
  }
}

function getDbDataFromPermit(permit: InsertPermit): Record<string, unknown> {
  return {
    organization_id: permit.organizationId,
    repository_id: permit.repositoryId,
    issue_id: permit.issueId,
    evm_network_id: permit.evmNetworkId,
    contributor_id: permit.contributorId,
    token_address: permit.tokenAddress,
    payout_amount: permit.payoutAmount,
    contributor_wallet: permit.contributorWallet,
    nonce: permit.nonce,
    deadline: permit.deadline,
    signature: permit.signature,
    partner_wallet: permit.partnerWallet,
  };
}

function getPermitFromDbData(data: Record<string, unknown>): Permit {
  return {
    id: data.id,
    createdAt: new Date(Date.parse(data.created_at as string)),
    organizationId: data.organization_id,
    repositoryId: data.repository_i,
    issueId: data.issue_id,
    evmNetworkId: data.evm_network_id,
    contributorId: data.contributor_id,
    tokenAddress: data.token_address,
    payoutAmount: data.payout_amount,
    contributorWallet: data.contributor_wallet,
    nonce: data.nonce,
    deadline: data.deadline,
    signature: data.signature,
    partnerWallet: data.partner_wallet,
  } as Permit;
}

export async function savePermit(permit: InsertPermit): Promise<Permit> {
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
}

export async function saveLabelChange(username: string, repository: string, label_from: string, label_to: string, hasAccess: boolean) {
  const { supabase } = getAdapters();
  const { data, error } = await supabase
    .from("label_changes")
    .insert({
      username,
      repository,
      label_from,
      label_to,
      authorized: hasAccess || false,
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
}

export async function getLabelChanges(repository: string, labels: string[]) {
  const { supabase } = getAdapters();
  const logger = getLogger();

  const { data, error } = await supabase.from("label_changes").select("*").in("label_to", labels).eq("repository", repository).eq("authorized", false);

  logger.debug(`Getting label changes done, { data: ${JSON.stringify(data)}, error: ${JSON.stringify(error)} }`);

  if (error) {
    throw new Error(`Error getting label changes: ${error.message}`);
  }

  if (data.length === 0) {
    return null;
  }
  return data[0];
}

export async function _approveLabelChange(changeId: number) {
  const { supabase } = getAdapters();
  const { error } = await supabase.from("label_changes").update({ authorized: true }).eq("id", changeId);

  if (error) {
    throw new Error(error.message);
  }

  return;
}
