import { getBotContext } from "../../../bindings";
import { COMMAND_INSTRUCTIONS } from "../../../configs";
import { addCommentToIssue } from "../../../helpers";
import { IssueType, Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";

export const listAvailableCommands = async (body: string): Promise<void> => {
  const { log, payload: _payload } = getBotContext();
  if (body != IssueCommentCommands.HELP && body.replace(/`/g, "") != IssueCommentCommands.HELP) {
    log.info(`Skipping to list available commands. body: ${body}`);
    return;
  }
  const payload = _payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    log.info("Skipping /help, reason: not issue");
    return;
  }

  if (issue!.state == IssueType.CLOSED) {
    log.info("Skipping '/assign', reason: closed ");
    return;
  }
  await addCommentToIssue(COMMAND_INSTRUCTIONS, issue!.number);
};
