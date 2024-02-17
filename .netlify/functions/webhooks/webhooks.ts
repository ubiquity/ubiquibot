import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import { EmitterWebhookEventName } from "@octokit/webhooks";
import { Context, createProbot } from "probot";
import app from "../../../src/main";
const probot = createProbot();
const loadingApp = probot.load(app);
export async function handler(event, _context: Context) {
  try {
    await loadingApp;
    await probot.webhooks.verifyAndReceive({
      id: event.headers["X-GitHub-Delivery"] || event.headers["x-github-delivery"] || "",
      name: (event.headers["X-GitHub-Event"] || event.headers["x-github-event"]) as EmitterWebhookEventName,
      signature: event.headers["X-Hub-Signature-256"] || event.headers["x-hub-signature-256"] || "",
      payload: JSON.parse(event.body),
    });
    return { statusCode: 200 }; // Success response
  } catch (error) {
    console.error(error);
    return { statusCode: error.status || 500 }; // Error response
  }
}
