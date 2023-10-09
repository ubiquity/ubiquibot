import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../../bindings/bot-runtime";

export class Super {
  supabase: SupabaseClient;
  runtime: Runtime; // convenience accessor

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.runtime = Runtime.getState();
  }
}
