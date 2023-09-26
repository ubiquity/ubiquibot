import { describe } from "@jest/globals";
import { execSync } from "child_process";
import "dotenv/config";
import { Octokit } from "octokit";
import { Server } from "probot";
import { RepositoryConfig } from "../src/types";
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
let adminUsername = "";
let collaboratorUsername = "";
let server: Server;

export function getOctokitAdmin(): Octokit {
  return octokitAdmin;
}
export function setOctokitAdmin(value: Octokit) {
  octokitAdmin = value;
}
export function getOctokitCollaborator(): Octokit {
  return octokitCollaborator;
}
export function setOctokitCollaborator(value: Octokit) {
  octokitCollaborator = value;
}
export function getAdminUsername(): string {
  return adminUsername;
}
export function setAdminUsername(value: string) {
  adminUsername = value;
}
export function getCollaboratorUsername(): string {
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

export const orgConfig: RepositoryConfig = {
  privateKeyEncrypted:
    "YU-tFJFczN3JPVoJu0pQKSbWoeiCFPjKiTXMoFnJxDDxUNX-BBXc6ZHkcQcHVjdOd6ZcEnU1o2jU3F-i05mGJPmhF2rhQYXkNlxu5U5fZMMcgxJ9INhAmktzRBUxWncg4L1HOalZIoQ7gm3nk1a84g",
};

export const CustomOctokit = Octokit.defaults({
  throttle: {
    onRateLimit: () => {
      return true;
    },
    onSecondaryRateLimit: () => {
      return true;
    },
  },
});

beforeAll(beforeAllHandler(), SIX_HOURS);

afterAll(afterAllHandler(), SIX_HOURS);

describe("commands test", testSuite());
