import { SupabaseClient } from "@supabase/supabase-js";
import { Telegram } from "telegraf";

export type Adapters = {
  supabase: SupabaseClient;
  telegram: Telegram;
};
