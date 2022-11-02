import { Probot } from "probot";
import { callbackOnAny } from "./utils/callbackOnAny";

module.exports = function main(app: Probot) {
  app.onAny(callbackOnAny);
};
