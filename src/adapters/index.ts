import { BotConfig } from "../types";
import { generateSupabase } from "./supabase/helpers/client";

export const createAdapters = (config: BotConfig) => {
  return {
    supabase: generateSupabase(config?.supabase?.url ?? process.env.SUPABASE_URL, config?.supabase?.key ?? process.env.SUPABASE_KEY),
  };
};
