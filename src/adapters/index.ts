import { Telegraf } from "telegraf";
import { BotConfig } from "../types";
import { Adapters } from "../types/adapters";
import { supabase } from "./supabase";
export * from "./telegram";

export const createAdapters = (config: BotConfig): Adapters => {
  return {
    supabase: supabase(config?.supabase?.url ?? process.env.SUPABASE_URL, config?.supabase?.key ?? process.env.SUPABASE_KEY),
    telegram: new Telegraf(config?.telegram?.token ?? process.env.TELEGRAM_BOT_TOKEN).telegram,
  };
};
