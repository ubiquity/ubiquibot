import { BotConfig } from "../types";
import { supabase } from "./supabase";

export const createAdapters = (config: BotConfig) => {
  return {
    supabase: supabase(config?.supabase?.url ?? process.env.SUPABASE_URL, config?.supabase?.key ?? process.env.SUPABASE_KEY),
  };
};
