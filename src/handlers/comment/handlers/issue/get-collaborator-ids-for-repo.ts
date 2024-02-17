import { Context } from "../../../../types/context";
import { GitHubUser } from "../../../../types/payload";

export async function getCollaboratorsForRepo(context: Context): Promise<GitHubUser[]> {
  const payload = context.payload;

  try {
    const collaboratorUsers = (await context.octokit.paginate(context.octokit.rest.repos.listCollaborators, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      per_page: 100,
    })) as GitHubUser[];
    return collaboratorUsers;
  } catch (err: unknown) {
    context.logger.error("Failed to fetch lists of collaborators", err);
    return [];
  }
}
