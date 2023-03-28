import { addAssignees, addCommentToIssue, removeAssignees } from "../../../helpers";
import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";
import { GLOBAL_STRINGS } from "../../../configs";

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
  const shouldUnassign = assignees.length > 0 && payload.sender.login === assignees[0];

  if (shouldUnassign) {
    await removeAssignees(issue_number, assignees);
    await addAssignees(issue_number, GLOBAL_STRINGS.assignees);
    await addCommentToIssue(`You have been unassigned from the bounty @${payload.sender.login}`, issue_number);
  }
};
