import { createProbot } from "probot";
import { EmitterWebhookEventName } from "@octokit/webhooks";
import app from "../src";
import { Request, Response } from "@cloudflare/workers-types";

export const worker = {
  async fetch(request: Request) {
    const probot = createProbot();
    await probot.load(app);
    const id = request.headers.get("X-GitHub-Delivery") || request.headers.get("x-github-delivery") || "";
    const name = (request.headers.get("X-GitHub-Event") || request.headers.get("x-github-event")) as EmitterWebhookEventName;
    const signature = request.headers.get("X-Hub-Signature-256") || request.headers.get("x-hub-signature-256") || "";
    const payloadString = await request.text();
    const payload = JSON.parse(payloadString);

    try {
      await probot.webhooks.verifyAndReceive({
        id,
        name,
        signature,
        payload,
      });

      return new Response(`{ "ok": true }`, {
        headers: { "content-type": "application/json" },
      });
    } catch (error: unknown) {
      console.error(error);

      const message = (error as { message: string }).message ?? "";

      return new Response(`{ "error": "${message}" }`, {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
};
