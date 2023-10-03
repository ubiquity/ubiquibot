import { createClient } from "@supabase/supabase-js";
import { BotConfig } from "../types";
import { Database } from "./supabase/types";

export const createAdapters = (config: BotConfig) => {
  return {
    supabase: generateSupabase(config?.supabase?.url ?? process.env.SUPABASE_URL, config?.supabase?.key ?? process.env.SUPABASE_KEY),
  };
};

export function generateSupabase(url: string, key: string) {
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
