import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import { Probot } from "probot";
import { bindEvents } from "./bindings";
import { GithubEvent } from "./types";

export default function main(app: Probot) {
  const allowedEvents = Object.values(GithubEvent);
  app.on(allowedEvents, bindEvents);
}
