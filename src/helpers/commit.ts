import { Context, Payload } from "../types";

export async function createCommitComment(
  context: Context,
  body: string,
  commitSha: string,
  path?: string,
  owner?: string,
  repo?: string
) {
  const payload = context.event.payload as Payload;
  if (!owner) {
    owner = payload.repository.owner.login;
  }
  if (!repo) {
    repo = payload.repository.name;
  }

  await context.event.octokit.rest.repos.createCommitComment({
    owner: owner,
    repo: repo,
    commit_sha: commitSha,
    body: body,
    path: path,
  });
}
