import { getLinkedPullRequests } from "../../../helpers/get-linked-issues-and-pull-requests";
import { Commit } from "../../../types/commit";
import { Context } from "../../../types/context";
import { getAllCommitsFromPullRequest } from "./get-all-commits-from-pull-request";
import { getAllEvents } from "./get-all-events";

export async function aggregateAssigneeActivity({
  context,
  login,
  name,
  number,
  assignees,
}: AggregateAssigneeActivity) {
  const allEvents = await getAllEvents({ context, owner: login, repo: name, issueNumber: number });
  const assigneeEvents = allEvents.filter((event) => assignees.includes(event.actor.login)); // Filter all events by assignees

  // check the linked pull request and then check that pull request's commits
  const linkedPullRequests = await getLinkedPullRequests(context, { owner: login, repository: name, issue: number });

  const allCommits = [] as Commit[];
  for (const pullRequest of linkedPullRequests) {
    try {
      const commits = await getAllCommitsFromPullRequest({
        context,
        owner: login,
        repo: name,
        pullNumber: pullRequest.number,
      });
      allCommits.push(...commits);
    } catch (error) {
      console.trace({ error });
      // return [];
    }
  }

  // DONE: check commits - e.g. https://api.github.com/repos/ubiquity/ubiquibot/pulls/644/commits?per_page=100
  // Filter all commits by assignees
  const assigneeCommits = allCommits.filter((commit) => {
    const name = commit.author?.login || commit.commit.committer?.name;
    if (!name) {
      return false;
    }
    assignees.includes(name);
  });
  return { assigneeEvents, assigneeCommits };
}
interface AggregateAssigneeActivity {
  context: Context;
  login: string;
  name: string;
  number: number;
  assignees: string[];
}
