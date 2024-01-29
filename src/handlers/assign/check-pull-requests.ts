import { getAllPullRequests, addAssignees } from "../../helpers/issue";
import { Context } from "../../types/context";

// Check for pull requests linked to their respective issues but not assigned to them
export async function checkPullRequests(context: Context) {
  const { logger, payload } = context;
  const pulls = await getAllPullRequests(context);

  if (pulls.length === 0) {
    return logger.debug(`No pull requests found at this time`);
  }

  // Loop through the pull requests and assign them to their respective issues if needed
  for (const pull of pulls) {
    const linkedIssue = await getLinkedIssues({
      context,
      owner: payload.repository.owner.login,
      repository: payload.repository.name,
      pull: pull.number,
    });

    // if pullRequestLinked is empty, continue
    if (linkedIssue == null || !pull.user || !linkedIssue) {
      continue;
    }

    const connectedPull = await getPullByNumber(context, pull.number);

    // Newly created PULL (draft or direct) pull does have same `created_at` and `updated_at`.
    if (connectedPull?.created_at !== connectedPull?.updated_at) {
      logger.debug("It's an updated Pull Request, reverting");
      continue;
    }

    const linkedIssueNumber = linkedIssue.substring(linkedIssue.lastIndexOf("/") + 1);

    // Check if the pull request opener is assigned to the issue
    const opener = pull.user.login;

    const issue = await getIssueByNumber(context, +linkedIssueNumber);
    if (!issue?.assignees) continue;

    // if issue is already assigned, continue
    if (issue.assignees.length > 0) {
      logger.debug(`Issue already assigned, ignoring...`);
      continue;
    }

    const assignedUsernames = issue.assignees.map((assignee) => assignee.login);
    if (!assignedUsernames.includes(opener)) {
      await addAssignees(context, +linkedIssueNumber, [opener]);
      logger.debug("Assigned pull request opener to issue", {
        pullRequest: pull.number,
        issue: linkedIssueNumber,
        opener,
      });
    }
  }
  return logger.debug(`Checking pull requests done!`);
}

export async function getLinkedIssues({ context, owner, repository, pull }: GetLinkedParams) {
  if (!pull || !context) return null;
  const { data } = await context.octokit.pulls.get({
    owner,
    repo: repository,
    pull_number: pull,
  });

  const body = data.body;
  if (!body) return null;

  const match = body.match(/#(\d+)/);
  const issueNumber = match ? match[1] : null;

  if (!issueNumber) {
    return null;
  }

  const issue = await context.octokit.issues.get({
    owner,
    repo: repository,
    issue_number: Number(issueNumber),
  });

  return issue.data.html_url;
}

export async function getPullByNumber(context: Context, pull: number) {
  const payload = context.payload;

  try {
    const response = await context.octokit.rest.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pull,
    });
    return response.data;
  } catch (err: unknown) {
    context.logger.fatal("Fetching pull request failed!", err);
    return;
  }
}
// Get issues by issue number
export async function getIssueByNumber(context: Context, issueNumber: number) {
  const payload = context.payload;
  try {
    const { data: issue } = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
    });
    return issue;
  } catch (e: unknown) {
    context.logger.fatal("Fetching issue failed!", e);
    return;
  }
}
export interface GetLinkedParams {
  context?: Context;
  owner: string;
  repository: string;
  issue?: number;
  pull?: number;
}
