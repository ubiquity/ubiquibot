import { createClient } from "@supabase/supabase-js";
import { Env } from "../types/global";

export const streamLogs = async (env: Env, request: Request) => {
  try {
    const upgradeHeader = request.headers.get("Upgrade");

    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();
    server.addEventListener("message", (event) => {
      server.send(event.data);
    });

    const supabaseClient = createClient(env.SUPABASE_KEY, env.SUPABASE_URL);

    // const channel = supabaseClient
    //   .channel("table-db-changes")
    //   .on(
    //     "postgres_changes",
    //     {
    //       event: "INSERT",
    //       schema: "public",
    //       table: "logs",
    //     },
    //     (payload) => server.send(JSON.stringify(payload))
    //   )
    //   .subscribe();

    // server.addEventListener("close", () => {
    //   channel.unsubscribe();
    // });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  } catch (e) {
    console.log(e);
  }
};
