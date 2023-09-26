import { Octokit } from "octokit";
import { WideRepoConfig } from "../src/types";
import YAML from "yaml";
import EventEmitter from "events";

export const webhookEventEmitter = new EventEmitter();

export function waitForNWebhooks(n = 1) {
  return new Promise<void>((resolve, reject) => {
    let i = 0;

    const timer = setTimeout(() => {
      reject(new Error(`timeout, received ${i} webhooks, expected ${n}`));
    }, 30000);

    webhookEventEmitter.on("event", () => {
      i += 1;
      if (i == n) {
        clearTimeout(timer);
        setTimeout(resolve, 1000);
      }
    });
  });
}

export async function createLabel(octokit: Octokit, owner: string, repo: string, label: string, color?: string) {
  try {
    await octokit.rest.issues.createLabel({
      owner,
      repo,
      name: label,
      color,
    });
  } catch (err: any) {
    expect(err).toBeDefined();
    expect(err?.status).toBe(422);
  }
}

export async function addLabelToIssue(octokit: Octokit, owner: string, repo: string, issueNumber: number, label: string) {
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [label],
  });
}

export async function removeLabelFromIssue(octokit: Octokit, owner: string, repo: string, issueNumber: number, label: string) {
  await octokit.rest.issues.removeLabel({
    owner,
    repo,
    issue_number: issueNumber,
    name: label,
  });
}

export async function createAndAddLabel(octokit: Octokit, owner: string, repo: string, issueNumber: number, label: string) {
  try {
    await octokit.rest.issues.createLabel({
      owner,
      repo,
      name: label,
    });
  } catch (err: any) {
    expect(err).toBeDefined();
    expect(err?.status).toBe(422);
  } finally {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: [label],
    });
    await waitForNWebhooks(1);
  }
}

export async function updateConfig(octokit: Octokit, owner: string, repo: string, path: string, config: WideRepoConfig | WideRepoConfig) {
  let sha: string | undefined = undefined;
  try {
    const fileContent = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    if (Array.isArray(fileContent.data)) {
      throw new Error("ubiquibot-config.yml should not be directory");
    }
    if (fileContent.data.type !== "file") {
      throw new Error("ubiquibot-config.yml is not a file");
    }
    sha = fileContent.data.sha;
  } catch (error: any) {
    expect(error).toBeDefined();
    expect(error?.status).toBe(404);
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: "Updated config for testing",
    content: Buffer.from(YAML.stringify(config)).toString("base64"),
    sha,
  });
}

export async function createComment(octokit: Octokit, owner: string, repo: string, issueNumber: number, body: string) {
  await octokit.rest.issues.createComment({
    repo,
    owner,
    issue_number: issueNumber,
    body: body,
  });
}

export async function getLastComment(octokit: Octokit, owner: string, repo: string, issueNumber: number) {
  const { data } = await octokit.rest.issues.listComments({
    repo,
    owner,
    issue_number: issueNumber,
    per_page: 100,
  });
  expect(data.length).toBeGreaterThan(0);
  return data[data.length - 1];
}

export async function checkLastComment(octokit: Octokit, owner: string, repo: string, issueNumber: number, expectedComment: string) {
  const lastComment = await getLastComment(octokit, owner, repo, issueNumber);
  expect(lastComment.body).toBe(expectedComment);
}
