import { createClient } from "@supabase/supabase-js";
import { BotConfig } from "../types";
import { Access } from "./supabase/helpers/tables/access";
import { Label } from "./supabase/helpers/tables/label";
import { Logs } from "./supabase/helpers/tables/logs";
import { Settlement } from "./supabase/helpers/tables/settlement";
import { Super } from "./supabase/helpers/tables/super";
import { User } from "./supabase/helpers/tables/user";
import { Wallet } from "./supabase/helpers/tables/wallet";
import { Database } from "./supabase/types";

export function createAdapters(config: BotConfig) {
  const client = generateSupabase(config.supabase.url, config.supabase.key);
  return {
    supabase: {
      access: new Access(client),
      wallet: new Wallet(client),
      user: new User(client),
      debit: new Settlement(client),
      settlement: new Settlement(client),
      label: new Label(client),
      logs: new Logs(client),
      super: new Super(client),
    },
  };
}

function generateSupabase(url: string | null, key: string | null) {
  if (!url || !key) throw new Error("Supabase url or key is not defined");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
