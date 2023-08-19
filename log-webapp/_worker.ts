import { streamLogs } from "./src/logHandler";
import { Env } from "./types/global";

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/log-engine") {
      // TODO: Add your custom /api/* logic here.
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      await streamLogs(env, server);

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
