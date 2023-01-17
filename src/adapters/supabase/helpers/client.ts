import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAdapters, getBotContext } from "../../../bindings";
import { Issue, UserProfile } from "../../../types";
import { Database } from "./database.types";

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

export type IssueAdditions = {
  timeline: string;
  priority: string;
  price: number;
  started_at?: number;
  completed_at?: number;
};

const getDbDataFromIssue = (issue: Issue, additions: IssueAdditions): any => {
  return {
    issue_number: issue.number,
    issue_url: issue.html_url,
    comments_url: issue.comments_url,
    events_url: issue.events_url,
    labels: issue.labels.map((issue) => issue.name),
    assignees: issue.assignees ? issue.assignees.map((assignee) => assignee.login) : [],
    timeline: additions.timeline,
    priority: additions.priority,
    price: additions.price,
    started_at: additions.started_at,
    completed_at: additions.completed_at,
    closed_at: issue.closed_at,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
};

export type UserProfileAdditions = {
  wallet_address?: string;
}
const getDbDataFromUserProfile = (userProfile: UserProfile, additions?: UserProfileAdditions): any => {
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
  const { log } = getBotContext();
  const { supabase } = getAdapters();
  const { data, error } = await supabase.from("issues").select("id").eq("issue_number", issue.number).single();

  if (data) {
    const key = data.id as number;
    const { data: _data, error: _error } = await supabase
      .from("issues")
      .upsert({ id: key, ...getDbDataFromIssue(issue, additions) })
      .select();
    log.info("Upserting an issue done", { data, error });
  } else if (error) {
    const { data: _data, error: _error } = await supabase.from("issues").insert(getDbDataFromIssue(issue, additions));
    log.info("Creating a new issue done", { data: _data, error: _error });
  }
};

/**
 * Performs an UPSERT on the users table.
 * @param user The user entity fetched from github event.
 */
export const upsertUser = async (user: UserProfile): Promise<void> => {
  const { log } = getBotContext();
  const { supabase } = getAdapters();
  const { data, error } = await supabase.from("users").select("id").eq("user_login", user.login).single();

  if (data) {
    const key = data.id as number;
    const { data: _data, error: _error } = await supabase
      .from("users")
      .upsert({ id: key, ...getDbDataFromUserProfile(user) })
      .select();
    log.info("Upserting an user done", { data, error });
  } else if (error) {
    const { data: _data, error: _error } = await supabase.from("users").insert(getDbDataFromUserProfile(user));
    log.info("Creating a new user done", { data: _data, error: _error });
  }
};
