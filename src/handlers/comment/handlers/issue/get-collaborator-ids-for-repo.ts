import { Context } from "../../../../types/context";
import { User } from "../../../../types/payload";

export async function getCollaboratorsForRepo(context: Context): Promise<User[]> {
  const payload = context.payload;

  try {
    const collaboratorUsers = (await context.octokit.paginate(context.octokit.rest.repos.listCollaborators, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      per_page: 100,
    })) as User[];
    return collaboratorUsers;
  } catch (err: unknown) {
    context.logger.error("Failed to fetch lists of collaborators", err);
    return [];
  }
}
