import { removeAssignees } from "../../../helpers";
import Runtime from "../../../bindings/bot-runtime";
import { Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { closePullRequestForAnIssue } from "../../assign/index";

export async function unassign(body: string) {
  const runtime = Runtime.getState();
  const { payload: _payload } = runtime.eventContext;
  const logger = runtime.logger;
  if (body != IssueCommentCommands.STOP && body.replace(/`/g, "") != IssueCommentCommands.STOP) {
    return logger.info(`Skipping to unassign. body: ${body}`);
  }

  const payload = _payload as Payload;
  logger.info(`Received '/stop' command from user: ${payload.sender.login}`);
  const issue = (_payload as Payload).issue;
  if (!issue) {
    return logger.info(`Skipping '/stop' because of no issue instance`);
  }

  const issueNumber = issue.number;
  const assignees = payload.issue?.assignees ?? [];

  if (assignees.length == 0) {
    return logger.warn(`No assignees found for issue ${issueNumber}`);
  }
  const shouldUnassign = payload.sender.login.toLowerCase() == assignees[0].login.toLowerCase();
  logger.debug(
    `Unassigning sender: ${payload.sender.login.toLowerCase()}, assignee: ${assignees[0].login.toLowerCase()}, shouldUnassign: ${shouldUnassign}`
  );

  if (shouldUnassign) {
    await closePullRequestForAnIssue();
    await removeAssignees(
      issueNumber,
      assignees.map((i) => i.login)
    );
    return logger.ok(`You have been unassigned from the task ${payload.sender.login}`);
  }
  return logger.warn(`You are not assigned to this task ${payload.sender.login}`);
}
