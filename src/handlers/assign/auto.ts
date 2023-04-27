import { Context } from "probot";
import { getBotContext, getLogger } from "../../bindings";
import { addAssignees, listIssuesForRepo } from "../../helpers";
import { IssueType, Payload } from "../../types";

// Use `context.octokit.rest` to get the pull requests for the repository
export const getPullRequests = async (context: Context) => {
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    const { data: pulls } = await context.octokit.rest.pulls.list({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state: "open",
    });
    return pulls;
  } catch (e: unknown) {
    logger.debug(`Fetching pull requests failed!, reason: ${e}`);
    return [];
  }
};

// Check for pull requests linked to their respective issues but not assigned to them
export const checkPullRequests = async () => {
  const context = getBotContext();
  const logger = getLogger();
  const pulls = await getPullRequests(context);

  if (pulls.length === 0) {
    logger.debug(`No pull requests found at this time`);
    return;
  }

  const payload = context.payload as Payload;

  // get issues for repo
  //const issues = await listIssuesForRepo(IssueType.OPEN);

  // Loop through the pull requests and assign them to their respective issues if needed
  for (const pull of pulls) {
    // Check if the pull request is linked to an issue
    const issueUrl = pull.issue_url;
    const linkedIssueNumber = issueUrl.substring(issueUrl.lastIndexOf("/") + 1);
    if (!linkedIssueNumber) {
      continue;
    }

    // Check if the pull request opener is assigned to the issue
    const opener = pull!.user!.login;
    const { data: issue } = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: +linkedIssueNumber,
    });

    // if issue is already assigned, continue
    if (issue!.assignees!.length > 0) {
      continue;
    }

    const assignedUsernames = issue!.assignees!.map((assignee) => assignee.login);
    if (!assignedUsernames.includes(opener)) {
      await addAssignees(+linkedIssueNumber, [opener]);
      logger.debug(`Assigned pull request #${pull.number} opener to issue ${linkedIssueNumber}.`);
      console.log(`Assigned pull request #${pull.number} opener to issue ${linkedIssueNumber}.`);
    }
  }
};
