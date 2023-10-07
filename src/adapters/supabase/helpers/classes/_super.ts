import { SupabaseClient } from "@supabase/supabase-js";

export class Super {
  client: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.client = supabase;
  }
}
