import { Probot } from "probot";
import { EmitterWebhookEventName } from "@octokit/webhooks";
import { bindEvents } from "./bindings";
import { GithubEvent } from "./types";

const UBIQUITY = `
  _|    _|  _|_|_|    _|_|_|    _|_|      _|    _|  _|_|_|  _|_|_|_|_|  _|      _|
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|        _|  _|
  _|    _|  _|_|_|      _|    _|  _|_|    _|    _|    _|        _|          _|
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|          _|
    _|_|    _|_|_|    _|_|_|    _|_|  _|    _|_|    _|_|_|      _|          _|

    `;

export default function main(app: Probot) {
  console.log(UBIQUITY);
  const allowedEvents = Object.values(GithubEvent) as EmitterWebhookEventName[];
  app.on(allowedEvents, bindEvents);
}
