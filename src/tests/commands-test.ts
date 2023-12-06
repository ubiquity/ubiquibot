import { describe } from "@jest/globals";
import { execSync } from "child_process";
import "dotenv/config";
import { Octokit } from "octokit";
import { Server } from "probot";
import { afterAllHandler } from "./after-all-handler";
import { beforeAllHandler } from "./before-all-handler";
import { testSuite } from "./test-suite";

export const TEST_TIME_LABEL = "Time: <1 Hour";
export const TEST_PRIORITY_LABEL = "Priority: 1 (Normal)";

export const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 hours

// return the current 7 character git commit hash using git rev-parse
export const GIT_COMMIT_HASH = execSync("git rev-parse --short HEAD").toString().trim();

export const owner = process.env.TEST_ORGANIZATION_NAME || "ubiquibot";
export const repo = process.env.TEST_REPOSITORY_NAME || "staging";

// generate setters and getters for the following variables
let octokitAdmin: Octokit;
let octokitCollaborator: Octokit;
let adminUsername: string | null = null;
let collaboratorUsername: string | null = null;
let server: Server;

export function getAdminUser(): Octokit {
  return octokitAdmin;
}
export function setAdminUser(value: Octokit) {
  octokitAdmin = value;
}
export function getCollaboratorUser(): Octokit {
  return octokitCollaborator;
}
export function setCollaboratorUser(value: Octokit) {
  octokitCollaborator = value;
}
export function getAdminUsername(): string | null {
  return adminUsername;
}
export function setAdminUsername(value: string) {
  adminUsername = value;
}
export function getCollaboratorUsername(): string | null {
  return collaboratorUsername;
}
export function setCollaboratorUsername(value: string) {
  collaboratorUsername = value;
}
export function getServer(): Server {
  return server;
}
export function setServer(value: Server) {
  server = value;
}

export const customOctokit = Octokit.defaults({
  throttle: {
    onRateLimit: () => true,
    onSecondaryRateLimit: () => true,
  },
});

beforeAll(beforeAllHandler(), SIX_HOURS);

afterAll(afterAllHandler(), SIX_HOURS);

describe("commands test", testSuite());
