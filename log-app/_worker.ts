import { CustomRealtimeClient, RealtimeConfig } from "./src/websocket";
import { Env } from "./types/global";

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/log-engine") {
      // TODO: Add your custom /api/* logic here.
      const config: RealtimeConfig = {
        schema: "public",
        table: "logs",
        event: "INSERT",
      };

      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();

      server.addEventListener("message", (event) => {
        console.log(event.data);
        server.send(event.data);
      });

      const realtimeClient = new CustomRealtimeClient(env.SUPABASE_URL, env.SUPABASE_KEY, config, server);
      realtimeClient.subscribeToChanges();

      server.addEventListener("close", (event) => {
        realtimeClient.closeChannel();
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
