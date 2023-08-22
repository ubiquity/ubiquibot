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

const getLastComment = async (issueNumber: number) => {
  const { data } = await octokit.rest.issues.listComments({
    repo,
    owner,
    issue_number: issueNumber,
  });
  expect(data.length).toBeGreaterThan(0);
  return data[data.length - 1];
};

const checkLastComment = async (issueNumber: number, expectedComment: string) => {
  const lastComment = await getLastComment(issueNumber);
  expect(lastComment.body).toBe(expectedComment);
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

  test("/wallet correct address", async () => {
    const newWallet = "0x82AcFE58e0a6bE7100874831aBC56Ee13e2149e7";
    await createComment(issue.number, `/wallet ${newWallet}`);
    await waitForNWebhooks(2);
    await checkLastComment(issue.number, `Updated the wallet address for @${username} successfully!\t Your new address: \`${newWallet}\``);
  }, 10000);

  test("/wallet wrong address", async () => {
    const newWallet = "0x82AcFE58e0a6bE7100874831aBC56";
    await createComment(issue.number, `/wallet ${newWallet}`);
    await waitForNWebhooks(2);
    await checkLastComment(issue.number, `Please include your wallet or ENS address.\n usage: /wallet 0x0000000000000000000000000000000000000000`);
  }, 10000);

  test("/multiplier", async () => {
    await createComment(issue.number, `/multiplier @${username}`);
    await waitForNWebhooks(2);

    await checkLastComment(issue.number, `Successfully changed the payout multiplier for @${username} to 1. The reason is not provided.`);

    await createComment(issue.number, `/multiplier @${username} 2`);
    await waitForNWebhooks(2);

    await checkLastComment(
      issue.number,
      `Successfully changed the payout multiplier for @${username} to 2. The reason is not provided. This feature is designed to limit the contributor's compensation for any bounty on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a bounty multiplier above 1?`
    );

    await createComment(issue.number, `/multiplier @${username} 2 "Testing reason"`);
    await waitForNWebhooks(2);

    await checkLastComment(
      issue.number,
      `Successfully changed the payout multiplier for @${username} to 2. The reason provided is "Testing reason". This feature is designed to limit the contributor's compensation for any bounty on the current repository due to other compensation structures (i.e. salary.) are you sure you want to use a bounty multiplier above 1?`
    );

    await createComment(issue.number, `/multiplier @${username} abcd`);
    await waitForNWebhooks(2);

    await checkLastComment(issue.number, `Successfully changed the payout multiplier for @${username} to 1. The reason provided is "abcd".`);

    await createComment(issue.number, `/multiplier abcd`);
    await waitForNWebhooks(2);

    await checkLastComment(issue.number, `Successfully changed the payout multiplier for @${username} to 1. The reason provided is "abcd".`);
  }, 60000);

  test("/query", async () => {
    const newWallet = "0x82AcFE58e0a6bE7100874831aBC56Ee13e2149e7";
    await createComment(issue.number, `/wallet ${newWallet}`);
    await waitForNWebhooks(2);

    const multiplier = "5";
    await createComment(issue.number, `/multiplier @${username} ${multiplier} 'Testing'`);
    await waitForNWebhooks(2);

    await createComment(issue.number, `/query @${username}`);
    await waitForNWebhooks(2);

    await checkLastComment(issue.number, `@${username}'s wallet address is ${newWallet} and  multiplier is ${multiplier}`);
  }, 20000);

  test("/query wrong username", async () => {
    await createComment(issue.number, `/query @INVALID_$USERNAME`);
    await waitForNWebhooks(2);

    await checkLastComment(issue.number, `Invalid syntax for query command \n usage /query @user`);
  }, 10000);

  test("/help", async () => {
    await createComment(issue.number, `/help`);
    await waitForNWebhooks(2);

    const lastComment = await getLastComment(issue.number);
    expect(lastComment.body?.includes("Available commands")).toBe(true);
  }, 10000);
});
