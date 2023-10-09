import { userCommands } from ".";
import Runtime from "../../../bindings/bot-runtime";

import { IssueType, Payload } from "../../../types";
import { IssueCommentCommands } from "../commands";

export const listAvailableCommands = async (body: string) => {
  const runtime = Runtime.getState();
  const { payload: _payload } = runtime.eventContext;
  const logger = runtime.logger;
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

  return generateHelpMenu();
};

export function generateHelpMenu() {
  const config = Runtime.getState().botConfig;
  const startEnabled = config.command.find((command) => command.name === "start");
  let helpMenu = "### Available Commands\n\n| Command | Description | Example |\n| --- | --- | --- |\n";
  const commands = userCommands();
  commands.map(
    (command) =>
      (helpMenu += `| \`${command.id}\` | ${breakSentences(command.description)} | ${breakLongString(
        command.example || ""
      )} |\n`) // add to help menu
  );

  if (!startEnabled)
    helpMenu += "\n\n***_To assign yourself to an issue, please open a draft pull request that is linked to it._***";

  return helpMenu;
}

function breakLongString(str: string, maxLen = 24) {
  let newStr = "";
  let spaceIndex = str.lastIndexOf(" ", maxLen);

  while (str.length > maxLen) {
    if (spaceIndex > -1) {
      newStr += str.slice(0, spaceIndex) + "<br>";
      str = str.slice(spaceIndex + 1);
    } else {
      const forcedBreakIndex = str.slice(0, maxLen).lastIndexOf(" ");
      if (forcedBreakIndex !== -1) {
        newStr += str.slice(0, forcedBreakIndex) + "<br>";
        str = str.slice(forcedBreakIndex + 1);
      } else {
        newStr += str.slice(0, maxLen) + "<br>";
        str = str.slice(maxLen);
      }
    }
    spaceIndex = str.lastIndexOf(" ", maxLen);
  }

  newStr += str;
  return newStr;
}

function breakSentences(str: string) {
  const sentences = str.endsWith(".") ? str.slice(0, -1).split(". ") : str.split(". ");
  if (sentences.length <= 1) {
    return str;
  }
  return sentences.join(".<br><br>");
}
