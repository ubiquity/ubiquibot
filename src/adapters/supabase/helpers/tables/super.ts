import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../../bindings/bot-runtime";

export class Super {
  public supabase: SupabaseClient;
  public runtime: Runtime; // convenience accessor

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.runtime = Runtime.getState();
  }
}
