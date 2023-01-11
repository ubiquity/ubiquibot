import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabase = (url: string, key: string) : SupabaseClient => {
    return createClient(url, key);
}