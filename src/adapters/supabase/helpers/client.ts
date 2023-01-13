import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAdapters } from "../../../bindings";
import { Database } from "./database.types";

/**
 * Creates a typescript client which will be used to interact with supabase platform
 * 
 * @param url - The supabase project url
 * @param key - The supabase project key
 * @returns - The supabase client
 */
export const supabase = (url: string, key: string): SupabaseClient => {
  return createClient<Database>(url, key);
};

/**
 * Gets the maximum issue number stored in `issues` table
 */
export const getMaxIssueNumber = async (): Promise<number> => {
  const { supabase} = getAdapters();

  const {data} = await supabase.from("issues").select("issue_number").order('issue_number', {ascending: false}).limit(1).single();
  if (data) {
    return Number(data.issue_number);
  } else {
    return 0;
  }
}