import { createClient } from "@supabase/supabase-js";

interface Env {
  ASSETS: Fetcher;
  SUPABASE_KEY: string;
  SUPABASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/log-engine") {
      // TODO: Add your custom /api/* logic here.
      return new Response(env.SUPABASE_KEY);
    }
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },
};
