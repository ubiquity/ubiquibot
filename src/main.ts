import { Probot } from "probot";
import { bindEvents } from "./bindings";

const UBIQUITY = `
  _|    _|  _|_|_|    _|_|_|    _|_|      _|    _|  _|_|_|  _|_|_|_|_|  _|      _|
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|        _|  _|
  _|    _|  _|_|_|      _|    _|  _|_|    _|    _|    _|        _|          _|
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|          _|
    _|_|    _|_|_|    _|_|_|    _|_|  _|    _|_|    _|_|_|      _|          _|

    `;

export default function main(app: Probot) {
  console.log(UBIQUITY);
  // app.onAny(bindEvents as any);
  app.on("issue_comment.created", bindEvents);
  app.on("issue_comment.edited", bindEvents);
  app.on("issues.closed", bindEvents);
}
