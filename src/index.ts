import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import { Probot } from "probot";
import { bindEvents } from "./bindings";
import { GitHubEvent } from "./types/payload";

export default function main(app: Probot) {
  const allowedEvents = Object.values(GitHubEvent);
  app.on(allowedEvents, bindEvents);
}
