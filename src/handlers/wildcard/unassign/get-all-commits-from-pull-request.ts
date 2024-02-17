import { Commit } from "../../../types/commit";
import { Context } from "../../../types/context";

export async function getAllCommitsFromPullRequest({ context, owner, repo, pullNumber }: GetAllCommits) {
  try {
    const commits = (await context.octokit.paginate(context.octokit.pulls.listCommits, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    })) as Commit[];
    return commits;
  } catch (err: unknown) {
    context.logger.error("Failed to fetch lists of commits", err);
    return [];
  }
}
interface GetAllCommits {
  context: Context;
  owner: string;
  repo: string;
  pullNumber: number;
}
