import { createClient } from "@supabase/supabase-js";
import { Access } from "./supabase/helpers/tables/access";
import { Label } from "./supabase/helpers/tables/label";
import { Locations } from "./supabase/helpers/tables/locations";
import { Logs } from "ubiquibot-logger";
import { Settlement } from "./supabase/helpers/tables/settlement";
import { Super } from "./supabase/helpers/tables/super";
import { User } from "./supabase/helpers/tables/user";
import { Wallet } from "./supabase/helpers/tables/wallet";

import { env } from "../bindings/env";
import { Database } from "./supabase/types/database";

export const supabaseClient = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_KEY, {
  auth: { persistSession: false },
});

export function createAdapters() {
  return {
    supabase: {
      access: new Access(supabaseClient),
      wallet: new Wallet(supabaseClient),
      user: new User(supabaseClient),
      debit: new Settlement(supabaseClient),
      settlement: new Settlement(supabaseClient),
      label: new Label(supabaseClient),
      logs: new Logs(supabaseClient, env.LOG_RETRY_LIMIT, env.LOG_LEVEL, null),
      locations: new Locations(supabaseClient),
      super: new Super(supabaseClient),
    },
  };
}
