import { SupabaseClient } from "@supabase/supabase-js";
import Runtime from "../../../../bindings/bot-runtime";
import { Context as ProbotContext } from "probot";

export class Super {
  protected supabase: SupabaseClient;
  protected runtime: Runtime; // convenience accessor
  protected context: ProbotContext;

  constructor(supabase: SupabaseClient, context: ProbotContext) {
    this.supabase = supabase;
    this.runtime = Runtime.getState();
    this.context = context;
  }
}
