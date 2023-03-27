import { getBotContext, getLogger } from "../../../bindings";
import { COMMAND_INSTRUCTIONS } from "../../../configs";
import { addCommentToIssue } from "../../../helpers";
import { IssueType, Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";

export const listAvailableCommands = async (body: string): Promise<void> => {
  const { payload: _payload } = getBotContext();
  const logger = getLogger();
  if (body != IssueCommentCommands.HELP && body.replace(/`/g, "") != IssueCommentCommands.HELP) {
    logger.info(`Skipping to list available commands. body: ${body}`);
    return;
  }
  const payload = _payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    logger.info("Skipping /help, reason: not issue");
    return;
  }

  if (issue!.state == IssueType.CLOSED) {
    logger.info("Skipping '/assign', reason: closed ");
    return;
  }
  await addCommentToIssue(COMMAND_INSTRUCTIONS, issue!.number);
};
