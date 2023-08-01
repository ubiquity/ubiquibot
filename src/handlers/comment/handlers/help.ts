import { userCommands } from ".";
import { getBotContext, getLogger } from "../../../bindings";
import { ASSIGN_COMMAND_ENABLED } from "../../../configs";
import { IssueType, Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";

export const listAvailableCommands = async (body: string) => {
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

  if (issue.state == IssueType.CLOSED) {
    logger.info("Skipping '/assign', reason: closed ");
    return;
  }

  return generateHelpMenu();
};

export const generateHelpMenu = () => {
  let helpMenu = "### Available commands\n```";
  const commands = userCommands();
  commands.map((command) => {
    // if first command, add a new line
    if (command.id === commands[0].id) {
      helpMenu += `\n`;
      if (!ASSIGN_COMMAND_ENABLED) return;
    }
    helpMenu += `- ${command.id}: ${command.description}`;
    // if not last command, add a new line (fixes too much space below)
    if (command.id !== commands[commands.length - 1].id) {
      helpMenu += `\n`;
    }
  });

  if (!ASSIGN_COMMAND_ENABLED) helpMenu += "```\n***_To assign yourself to an issue, please open a draft pull request that is linked to it._***";
  return helpMenu;
};
