import { createClient } from "@supabase/supabase-js";
import { BotConfig } from "../types";
import { Access } from "./supabase/helpers/classes/access";
import { Settlement } from "./supabase/helpers/classes/settlement";
import { Label } from "./supabase/helpers/classes/label";
import { Super } from "./supabase/helpers/classes/super";
import { User } from "./supabase/helpers/classes/user";
import { Wallet } from "./supabase/helpers/classes/_wallet";
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
      debit: new Settlement(client),
      settlement: new Settlement(client),
      label: new Label(client),
      super: new Super(client),
    },
  };
}

function generateSupabase(url: string, key: string) {
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
