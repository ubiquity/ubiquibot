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
import { env } from "../bindings/env";

const supabaseClient = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_KEY, { auth: { persistSession: false } });

export function createAdapters(context: Context) {
  return {
    supabase: {
      access: new Access(supabaseClient, context),
      wallet: new Wallet(supabaseClient, context),
      user: new User(supabaseClient, context),
      debit: new Settlement(supabaseClient, context),
      settlement: new Settlement(supabaseClient, context),
      label: new Label(supabaseClient, context),
      logs: new Logs(supabaseClient, context),
      locations: new Locations(supabaseClient, context),
      super: new Super(supabaseClient, context),
    },
  };
}
