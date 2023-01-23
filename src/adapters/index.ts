import { Telegraf } from "telegraf";
import { BotConfig } from "../types";
import { Adapters } from "../types/adapters";
import { supabase } from "./supabase";
export * from "./telegram";

export const createAdapters = (config: BotConfig): Adapters => {
  return {
    supabase: supabase(config.supabase.url, config.supabase.key),
    telegram: new Telegraf(config.telegram.token),
  };
};
