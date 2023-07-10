import { createProbot } from "probot";
import { Handler } from "@netlify/functions";
import { EmitterWebhookEventName } from "@octokit/webhooks";

import app from "../../src";

const probot = createProbot();
const loadingApp = probot.load(app);

export const handler: Handler = async (event, context) => {
  try {
    await loadingApp;
    if (event.body) {
      await probot.webhooks.verifyAndReceive({
        id: event.headers["X-GitHub-Delivery"] || event.headers["x-github-delivery"] || "",
        name: (event.headers["X-GitHub-Event"] || event.headers["x-github-event"]) as EmitterWebhookEventName,
        signature: event.headers["X-Hub-Signature-256"] || event.headers["x-hub-signature-256"] || "",
        payload: JSON.parse(event.body),
      });

      return {
        statusCode: 200,
        body: '{"ok":true}',
      };
    } else {
      return {
        statusCode: 500,
        error: "Invalid event body",
      };
    }
  } catch (error: unknown) {
    console.error(error);

    return {
      statusCode: (error as { status: number }).status ?? 500,
      context,
      error: "ooops",
    };
  }
};
