import { SupabaseClient } from "@supabase/supabase-js"

export type Adapters = {
    supabase: SupabaseClient,
    /**
     * TODO: need to setup proper types for telegram, twitter, discord bots 
     * 
     * telegram: TelegramClient,
     * discord: DiscordClient,
     * twitter: TwitterClient,
     */
}