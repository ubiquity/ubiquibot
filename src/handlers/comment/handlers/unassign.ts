import Runtime from "../../../bindings/bot-runtime";
import { Payload } from "../../../types";
import { closePullRequestForAnIssue } from "../../assign/index";

export async function unassign(body: string) {
  const runtime = Runtime.getState();
  const { payload: _payload } = runtime.latestEventContext;
  const logger = runtime.logger;
  if (!body.startsWith("/stop")) {
    return logger.error("Skipping to unassign", { body });
  }

  const payload = _payload as Payload;
  logger.info("Running '/stop' command handler", { sender: payload.sender.login });
  const issue = (_payload as Payload).issue;
  if (!issue) {
    return logger.info(`Skipping '/stop' because of no issue instance`);
  }

  const issueNumber = issue.number;
  const assignees = payload.issue?.assignees ?? [];

  if (assignees.length == 0) {
    return logger.warn("No assignees found for issue", { issueNumber });
  }
  const shouldUnassign = assignees[0]?.login.toLowerCase() == payload.sender.login.toLowerCase();
  logger.debug("Unassigning sender", {
    sender: payload.sender.login.toLowerCase(),
    assignee: assignees[0]?.login.toLowerCase(),
    shouldUnassign,
  });

  if (shouldUnassign) {
    await closePullRequestForAnIssue();
    const { login } = payload.repository.owner;
    const { name: repo } = payload.repository;
    const context = runtime.latestEventContext;
    await context.octokit.rest.issues.removeAssignees({
      owner: login,
      repo: repo,
      issue_number: issueNumber,
      assignees: [payload.sender.login],
    });
    return logger.ok("You have been unassigned from the task", { issueNumber, user: payload.sender.login });
  }
  return logger.warn("You are not assigned to this task", { issueNumber, user: payload.sender.login });
}
