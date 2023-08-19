import { createClient } from "@supabase/supabase-js";
import { Env } from "../types/global";

export const streamLogs = async (env: Env, server: WebSocket) => {
  const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  try {
    server.accept();

    server.addEventListener("message", async (message) => {
      console.log(message.data);
      server.send(message.data);

      supabaseClient
        .channel("table-db-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "logs",
          },
          (payload) => {
            server.send(JSON.stringify(payload.new));
            console.log(payload);
          }
        )
        .subscribe();
    });
  } catch (e) {
    console.log("Error", e);
  }
};
