import { streamLogs } from "./src/logHandler";
import { Env } from "./types/global";

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/log-engine") {
      // Respond to the original request with a WebSocket URL
      return streamLogs(env, request);
    }
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },
};
