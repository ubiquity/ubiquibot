import { getBotContext, getLogger } from "../../bindings";
import { ASSIGN_COMMAND_ENABLED } from "../../configs";
import { addAssignees, getIssueByNumber, getPullRequests } from "../../helpers";
import { gitLinkedIssueParser } from "../../helpers/parser";
import { Payload } from "../../types";

// Check for pull requests linked to their respective issues but not assigned to them
export const checkPullRequests = async () => {
  const context = getBotContext();
  const logger = getLogger();
  const pulls = await getPullRequests(context);

  if (ASSIGN_COMMAND_ENABLED) return;

  if (pulls.length === 0) {
    logger.debug(`No pull requests found at this time`);
    return;
  }

  const payload = context.payload as Payload;

  // Loop through the pull requests and assign them to their respective issues if needed
  for (const pull of pulls) {
    const pullRequestLinked = await gitLinkedIssueParser({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: pull.number,
    });

    // if pullRequestLinked is empty, continue
    if (pullRequestLinked == "" || !pull.user) {
      continue;
    }

    const linkedIssueNumber = pullRequestLinked.substring(pullRequestLinked.lastIndexOf("/") + 1);

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
      await addAssignees(+linkedIssueNumber, [opener]);
      logger.debug(`Assigned pull request #${pull.number} opener to issue ${linkedIssueNumber}.`);
    }
  }
};
