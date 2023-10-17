import Runtime from "../bindings/bot-runtime";
import { Payload } from "../types";

export async function createCommitComment(
  body: string,
  commitSha: string,
  path?: string,
  owner?: string,
  repo?: string
) {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const payload = context.payload as Payload;
  if (!owner) {
    owner = payload.repository.owner.login;
  }
  if (!repo) {
    repo = payload.repository.name;
  }

  await context.octokit.rest.repos.createCommitComment({
    owner: owner,
    repo: repo,
    commit_sha: commitSha,
    body: body,
    path: path,
  });
}
