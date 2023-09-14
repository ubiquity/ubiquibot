import { Env } from "./types/global";

export default {
  async fetch(request: Request, env: Env) {
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },
};
