import { userCommands } from ".";
import { getLogger } from "../../../bindings";
import { ASSIGN_COMMAND_ENABLED } from "../../../configs";
import { BotContext, IssueType, Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";

export const listAvailableCommands = async (context: BotContext, body: string) => {
  const { payload: _payload } = context;
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
    logger.info("Skipping '/start', reason: closed ");
    return;
  }

  return generateHelpMenu(context);
};


export const generateHelpMenu = (context: BotContext) => {

  const startEnabled = context.botConfig.command.find((command) => command.name === "start");

  let helpMenu = "### Available commands\n```";
  const commands = userCommands(context);
  commands.map((command) => {
    // if first command, add a new line
    if (command.id === commands[0].id) {
      helpMenu += `\n`;
      if (!startEnabled) return;
    }
    helpMenu += `- ${command.id}: ${command.description}`;
    // if not last command, add a new line (fixes too much space below)
    if (command.id !== commands[commands.length - 1].id) {
      helpMenu += `\n`;
    }
  });

  if (!startEnabled) helpMenu += "```\n***_To assign yourself to an issue, please open a draft pull request that is linked to it._***";
  return helpMenu;
};
