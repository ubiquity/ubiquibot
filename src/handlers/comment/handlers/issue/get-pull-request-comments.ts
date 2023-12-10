import { getLinkedPullRequests } from "../../../../helpers/get-linked-issues-and-pull-requests";
import { getAllIssueComments } from "../../../../helpers/issue";
import { Context } from "../../../../types/context";

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
