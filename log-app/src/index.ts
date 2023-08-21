/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { CustomRealtimeClient, RealtimeConfig } from "./websocket";

export interface Env {
  SUPABASE_KEY: string;
  SUPABASE_URL: string;
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
  },
};
