import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

export const supabase = (url: string, key: string): SupabaseClient => {
  return createClient<Database>(url, key);
};
