import { createClient } from "@supabase/supabase-js";
import { Context } from "../types";
import { Access } from "./supabase/helpers/tables/access";
import { Label } from "./supabase/helpers/tables/label";
import { Locations } from "./supabase/helpers/tables/locations";
import { Logs } from "./supabase/helpers/tables/logs";
import { Settlement } from "./supabase/helpers/tables/settlement";
import { Super } from "./supabase/helpers/tables/super";
import { User } from "./supabase/helpers/tables/user";
import { Wallet } from "./supabase/helpers/tables/wallet";
import { Database } from "./supabase/types";

export function createAdapters(context: Context) {
  const client = generateSupabase(context.config.supabase.url, context.config.supabase.key);
  return {
    supabase: {
      access: new Access(client, context),
      wallet: new Wallet(client, context),
      user: new User(client, context),
      debit: new Settlement(client, context),
      settlement: new Settlement(client, context),
      label: new Label(client, context),
      logs: new Logs(client, context),
      locations: new Locations(client, context),
      super: new Super(client, context),
    },
  };
}

function generateSupabase(url: string | null, key: string | null) {
  if (!url || !key) throw new Error("Supabase url or key is not defined");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
