import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

process.env.PRIVATE_KEY = process.env.APP_PRIVATE_KEY; // FIXME: hack for probot to authenticate

import { Probot } from "probot";
import { bindEvents } from "./bindings/event";
import { GitHubEvent } from "./types/github-events";

export default function main(app: Probot) {
  const allowedEvents = Object.values(GitHubEvent);
  app.on(allowedEvents, bindEvents);
}
