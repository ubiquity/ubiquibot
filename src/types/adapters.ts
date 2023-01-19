import { SupabaseClient } from "@supabase/supabase-js";
import { Telegraf } from "telegraf";

export type Adapters = {
  supabase: SupabaseClient;
  telegram: Telegraf;
};
