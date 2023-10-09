import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import { Probot } from "probot";
import { EmitterWebhookEventName } from "@octokit/webhooks";
import { bindEvents } from "./bindings";
import { GithubEvent } from "./types";

export default function main(app: Probot) {
  const allowedEvents = Object.values(GithubEvent) as EmitterWebhookEventName[];
  app.on(allowedEvents, bindEvents);
}
