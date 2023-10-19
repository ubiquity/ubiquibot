import Runtime from "../../../../bindings/bot-runtime";
import { Payload } from "../../../../types/payload";
import { Context } from "probot/lib/context";
export async function getCollaboratorIdsForRepo(context: Context): Promise<number[]> {
  const runtime = Runtime.getState();
  const payload = context.payload as Payload;
  const collaboratorIds: number[] = [];

  try {
    let page = 1;
    let shouldFetch = true;

    while (shouldFetch) {
      const res = await context.octokit.rest.repos.listCollaborators({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        per_page: 100,
        page: page,
      });

      if (res.data.length > 0) {
        res.data.forEach((collaborator) => collaboratorIds.push(collaborator.id));
        page++;
      } else {
        shouldFetch = false;
      }
    }
  } catch (e: unknown) {
    runtime.logger.error("Fetching collaborator IDs for repo failed!", e);
  }

  return collaboratorIds;
}
