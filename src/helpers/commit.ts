import { Payload } from "../types";
import { Context as ProbotContext } from "probot";

export async function createCommitComment(
  context: ProbotContext,
  body: string,
  commitSha: string,
  path?: string,
  owner?: string,
  repo?: string
) {
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
