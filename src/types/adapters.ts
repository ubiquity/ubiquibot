import { SupabaseClient } from "@supabase/supabase-js";
import { Telegram as TelegramClient } from "telegraf";

export type Adapters = {
  supabase: SupabaseClient;
  telegram: TelegramClient;
};
