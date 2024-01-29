import { GetLinkedParams, getLinkedIssues } from "../handlers/assign/check-pull-requests";
import { Context } from "../types/context";
import { getAllPullRequests } from "./issue";
interface GetLinkedResults {
  organization: string;
  repository: string;
  number: number;
  href: string;
}
export async function getLinkedPullRequests(
  context: Context,
  { owner, repository, issue }: GetLinkedParams
): Promise<GetLinkedResults[]> {
  if (!issue) return [];
  // const logger = context.logger;
  const collection = [] as GetLinkedResults[];
  const pulls = await getAllPullRequests(context);
  const currentIssue = await context.octokit.issues.get({
    owner,
    repo: repository,
    issue_number: issue,
  });
  for (const pull of pulls) {
    const linkedIssue = await getLinkedIssues({
      context,
      owner: owner,
      repository: repository,
      pull: pull.number,
    });

    if (linkedIssue === currentIssue.data.html_url) {
      collection.push({
        organization: owner,
        repository,
        number: pull.number,
        href: pull.html_url,
      });
    }
  }

  return collection;
}
