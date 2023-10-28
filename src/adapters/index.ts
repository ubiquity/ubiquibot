import { createClient } from "@supabase/supabase-js";
import { AllConfigurationTypes } from "../types";
import { Access } from "./supabase/helpers/tables/access";
import { Label } from "./supabase/helpers/tables/label";
import { Locations } from "./supabase/helpers/tables/locations";
import { Logs } from "./supabase/helpers/tables/logs";
import { Settlement } from "./supabase/helpers/tables/settlement";
import { Super } from "./supabase/helpers/tables/super";
import { User } from "./supabase/helpers/tables/user";
import { Wallet } from "./supabase/helpers/tables/wallet";
import { Database } from "./supabase/types";

export function createAdapters(configuration: AllConfigurationTypes) {
  const client = generateSupabase(configuration.supabaseUrl, configuration.supabaseKey);
  return {
    supabase: {
      access: new Access(client),
      wallet: new Wallet(client),
      user: new User(client),
      debit: new Settlement(client),
      settlement: new Settlement(client),
      label: new Label(client),
      logs: new Logs(client),
      locations: new Locations(client),
      super: new Super(client),
    },
  };
}

function generateSupabase(url?: string | null, key?: string | null) {
  if (!url || !key) throw new Error("Supabase URL or key is not defined");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
