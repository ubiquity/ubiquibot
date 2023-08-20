import { describe, expect, test } from "@jest/globals";
import { Probot, Server, run } from "probot";
import { EmitterWebhookEventName } from "@octokit/webhooks";
import { bindEvents } from "../src/bindings";
import { GithubEvent, Issue } from "../src/types";
import { Octokit } from "octokit";
import "dotenv/config";

let server: Server;
let octokit: Octokit;
const repo = process.env.TEST_REPO || "ubiquibot";
const owner = process.env.TEST_OWNER || "staging";
const pat = process.env.TEST_PAT;
let username = "";

beforeAll(async () => {
  if (!pat) {
    throw new Error("missing TEST_PAT");
  }

  server = await run(function main(app: Probot) {
    const allowedEvents = Object.values(GithubEvent) as EmitterWebhookEventName[];
    app.on(allowedEvents, bindEvents);
  });

  octokit = new Octokit({ auth: pat });

  const { data } = await octokit.rest.users.getAuthenticated();
  username = data.login;
});

afterAll(async () => {
  await server.stop();
});

const waitForNWebhooks = (n: number) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, 10000);

    let i = 0;
    server.probotApp.onAny(() => {
      i += 1;
      if (i == n) {
        clearTimeout(timer);
        resolve();
      }
    });
  });

const createComment = (issueNumber: number, body: string) => {
  return octokit.rest.issues.createComment({
    repo,
    owner,
    issue_number: issueNumber,
    body: body,
  });
};

describe("commmands test", () => {
  let issue: Issue;

  beforeAll(async () => {
    const res = await octokit.rest.issues.create({
      repo,
      owner,
      title: "E2E TEST",
    });
    issue = res.data as Issue;

    await waitForNWebhooks(1);
  }, 10000);

  test("/wallet", async () => {
    const newWallet = "0x82AcFE58e0a6bE7100874831aBC56Ee13e2149e7";
    await createComment(issue.number, `/wallet ${newWallet}`);
    await waitForNWebhooks(2);
    const { data } = await octokit.rest.issues.listComments({
      repo,
      owner,
      issue_number: issue.number,
    });
    expect(data[data.length - 1].body).toBe(`Updated the wallet address for @${username} successfully!\t Your new address: \`${newWallet}\``);
  }, 10000);

  test("/wallet wrong address", async () => {
    const newWallet = "0x82AcFE58e0a6bE7100874831aBC56";
    await createComment(issue.number, `/wallet ${newWallet}`);
    await waitForNWebhooks(2);
    const { data } = await octokit.rest.issues.listComments({
      repo,
      owner,
      issue_number: issue.number,
    });
    expect(data[data.length - 1].body).toBe(`Please include your wallet or ENS address.\n usage: /wallet 0x0000000000000000000000000000000000000000`);
  }, 10000);
});
