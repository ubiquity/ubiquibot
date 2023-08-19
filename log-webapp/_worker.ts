import { createClient } from "@supabase/supabase-js";
import { streamLogs } from "./src/logHandler";
import { Env } from "./types/global";

export default {
  async fetch(request: Request, env: Env) {
    const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

    const url = new URL(request.url);

    if (url.pathname === "/log-engine") {
      // TODO: Add your custom /api/* logic here.
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }

      const [client, server] = Object.values(new WebSocketPair());

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

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },
};
