import { Probot } from "probot";
import { callbackOnAny } from "./utils/callbackOnAny";
export default function main (app: Probot) {
  // @ts-ignore-error
  app.onAny(callbackOnAny);
}
