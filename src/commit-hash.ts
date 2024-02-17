import { execSync } from "child_process";
export let COMMIT_HASH: null | string = null; // "0000000000000000000000000000000000000000";

try {
  COMMIT_HASH = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  // netlify has no git binary
}
