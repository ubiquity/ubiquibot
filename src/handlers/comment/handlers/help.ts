import { userCommands } from ".";
import { getBotContext, getLogger } from "../../../bindings";
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
  await addCommentToIssue(generateHelpMenu(), issue!.number);
};

export const generateHelpMenu = () => {
  let helpMenu = "### Available commands\n```";

  userCommands.map((command) => {
    // if first command, add a new line
    if (command.id === userCommands[0].id) {
      helpMenu += `\n`;
    }
    helpMenu += `- ${command.id}: ${command.description}`;
    // if not last command, add a new line (fixes too much space below)
    if (command.id !== userCommands[userCommands.length - 1].id) {
      helpMenu += `\n`;
    }
  });

  helpMenu += "```";
  return helpMenu;
};
