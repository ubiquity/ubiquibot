import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../../bindings/bot-runtime";
import { Context } from "../../../../types";

export class Super {
  protected supabase: SupabaseClient;
  protected runtime: Runtime; // convenience accessor
  protected context: Context;

  constructor(supabase: SupabaseClient, context: Context) {
    this.supabase = supabase;
    this.runtime = Runtime.getState();
    this.context = context;
  }
}
