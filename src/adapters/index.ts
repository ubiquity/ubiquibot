import { createClient } from "@supabase/supabase-js";
import { BotConfig } from "../types";
import { Access } from "./supabase/helpers/classes/Access";
import { Label } from "./supabase/helpers/classes/Label";
import { Settlement } from "./supabase/helpers/classes/Settlement";
import { Super } from "./supabase/helpers/classes/Super";
import { User } from "./supabase/helpers/classes/User";
import { Wallet } from "./supabase/helpers/classes/Wallet";
import { Database } from "./supabase/types";

export function createAdapters(config: BotConfig) {
  const client = generateSupabase(
    config?.supabase?.url ?? process.env.SUPABASE_URL,
    config?.supabase?.key ?? process.env.SUPABASE_KEY
  );
  return {
    supabase: {
      client,
      access: new Access(client),
      wallet: new Wallet(client),
      user: new User(client),
      settlement: new Settlement(client),
      label: new Label(client),
      super: new Super(client),
    },
  };
}

function generateSupabase(url: string, key: string) {
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
