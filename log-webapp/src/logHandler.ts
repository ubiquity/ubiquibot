import { createClient } from "@supabase/supabase-js";
import { Env } from "../types/global";
import { WebSocketServer } from "ws";

export const streamLogs = async (env: Env, request: Request) => {
  try {
    const upgradeHeader = request.headers.get("Upgrade");

    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const wss = new WebSocketServer({ port: 8080 });

    wss.on("connection", function connection(ws) {
      ws.on("message", function message(data) {
        console.log("received: %s", data);
      });

      ws.send("something");
    });

    // const supabaseClient = createClient(env.SUPABASE_KEY, env.SUPABASE_URL);

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
  } catch (e) {
    console.log(e);
  }
};
