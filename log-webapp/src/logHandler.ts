import { createClient } from "@supabase/supabase-js";
import { Env } from "../types/global";

export const streamLogs = async (env: Env, server: WebSocket) => {
  try {
    server.accept();

    server.addEventListener("message", async (message) => {
      console.log(message);
    });

    const supabaseClient = createClient(env.SUPABASE_KEY, env.SUPABASE_URL);

    const channel = supabaseClient
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "logs",
        },
        (payload) => server.send(JSON.stringify(payload))
      )
      .subscribe();

    server.addEventListener("close", () => {
      channel.unsubscribe();
    });
  } catch (e) {
    console.log(e);
  }
};
