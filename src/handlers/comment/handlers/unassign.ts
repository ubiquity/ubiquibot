import { removeAssignees } from "../../../helpers";
import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { closePullRequestOfTheIssue } from "../../assign/action";

export const unassign = async (body: string) => {
  const { payload: _payload } = getBotContext();
  const logger = getLogger();
  if (body != IssueCommentCommands.UNASSIGN && body.replace(/`/g, "") != IssueCommentCommands.UNASSIGN) {
    logger.info(`Skipping to unassign. body: ${body}`);
    return;
  }

  const payload = _payload as Payload;
  logger.info(`Received '/unassign' command from user: ${payload.sender.login}`);
  const issue = (_payload as Payload).issue;
  if (!issue) {
    logger.info(`Skipping '/unassign' because of no issue instance`);
    return;
  }

  const issue_number = issue!.number;
  const _assignees = payload.issue?.assignees;
  const assignees = _assignees ?? [];
  if (assignees.length == 0) return;
  const shouldUnassign = payload.sender.login.toLowerCase() == assignees[0].login.toLowerCase();
  logger.debug(`Unassigning sender: ${payload.sender.login.toLowerCase()}, assignee: ${assignees[0].login.toLowerCase()}, shouldUnassign: ${shouldUnassign}`);

  if (shouldUnassign) {
    await closePullRequestOfTheIssue();
    await removeAssignees(
      issue_number,
      assignees.map((i) => i.login)
    );
    return `You have been unassigned from the bounty @${payload.sender.login}`;
  }
  return;
};
