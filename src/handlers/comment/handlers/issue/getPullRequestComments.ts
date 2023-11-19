import { getAllIssueComments } from "../../../../helpers";
import { getLinkedPullRequests } from "../../../../helpers/parser";
import { Context } from "../../../../types";
import { Comment } from "../../../../types/payload";

export async function getPullRequestComments(context: Context, owner: string, repository: string, issueNumber: number) {
  const pullRequestComments: Comment[] = [];
  const linkedPullRequests = await getLinkedPullRequests(context, { owner, repository, issue: issueNumber });
  if (linkedPullRequests.length) {
    const linkedCommentsPromises = linkedPullRequests.map((pull) => getAllIssueComments(context, pull.number));
    const linkedCommentsResolved = await Promise.all(linkedCommentsPromises);
    for (const linkedComments of linkedCommentsResolved) {
      pullRequestComments.push(...linkedComments);
    }
  }
  return pullRequestComments;
}
