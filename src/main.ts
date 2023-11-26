import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import { Probot } from "probot";
import { GitHubEvent } from "./types/payload";
import { bindEvents } from "./bindings/event";

export default function main(app: Probot) {
  const allowedEvents = Object.values(GitHubEvent);
  app.on(allowedEvents, bindEvents);
}
