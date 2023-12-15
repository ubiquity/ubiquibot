import { Context } from "../../../types/context";
import { GitHubIssue, IssueType } from "../../../types/payload";
import { checkTaskToUnassign } from "./check-task-to-unassign";

// type Commit[] = Commit[]; // RestEndpointMethodTypes["pulls"]["listCommits"]["response"]["data"];
export async function checkTasksToUnassign(context: Context) {
  const logger = context.logger;
  logger.debug("Checking tasks to unassign");

  const issuesAndPullsOpened = await listAllIssuesAndPullsForRepo(context, IssueType.OPEN);

  // logger.debug("Fetched all issues and pulls opened", { issuesAndPullsOpened });
  const assignedIssues = issuesAndPullsOpened.filter((issue) => issue.assignee);

  const tasksToUnassign = await Promise.all(
    assignedIssues.map((assignedIssue: GitHubIssue) => checkTaskToUnassign(context, assignedIssue))
  );

  logger.debug("Checked tasks to unassign", { tasksToUnassign });

  logger.ok("Checked all the tasks to unassign", {
    tasksToUnassign: tasksToUnassign.filter(Boolean).map((task) => task?.metadata),
  });
}
async function listAllIssuesAndPullsForRepo(
  context: Context,
  state: "open" | "closed" | "all" = "open",
  sort: "created" | "updated" | "comments" = "created",
  direction: "desc" | "asc" = "desc"
) {
  const payload = context.payload;
  try {
    const issues = (await context.octokit.paginate(context.octokit.issues.listForRepo, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state,
      sort,
      direction,
      per_page: 100,
    })) as GitHubIssue[];
    return issues;
  } catch (err: unknown) {
    context.logger.fatal("Listing all issues and pulls failed!", err);
    return [];
  }
}
