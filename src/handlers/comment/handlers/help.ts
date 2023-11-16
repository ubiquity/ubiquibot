import { userCommands } from ".";
import Runtime from "../../../bindings/bot-runtime";
import { Context, Payload } from "../../../types";

export async function listAvailableCommands(context: Context, body: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  if (body != "/help") {
    return logger.info("Skipping to list available commands.", { body });
  }
  const payload = context.event.payload as Payload;
  const issue = payload.issue;

  if (!issue) {
    return logger.info("Skipping /help, reason: not issue");
  }

  return generateHelpMenu(context);
}

export function generateHelpMenu(context: Context) {
  const config = context.config;
  const startDisabled = config.disabledCommands.some((command) => command === "start");
  let helpMenu = "### Available Commands\n\n| Command | Description | Example |\n| --- | --- | --- |\n";
  const commands = userCommands(config.miscellaneous.registerWalletWithVerification);

  commands.map(
    (command) =>
      (helpMenu += `| \`${command.id}\` | ${breakSentences(command.description) || ""} | ${
        (command.example && breakLongString(command.example)) || ""
      } |\n`) // add to help menu
  );

  if (startDisabled) {
    helpMenu += "\n\n***_To assign yourself to an issue, please open a draft pull request that is linked to it._***";
  }
  return helpMenu;
}

function breakLongString(str: string, maxLen = 24) {
  const newStr = [] as string[];
  let spaceIndex = str.indexOf(" ", maxLen); // Find the first space after maxLen

  while (str.length > maxLen && spaceIndex !== -1) {
    newStr.push(str.slice(0, spaceIndex));
    str = str.slice(spaceIndex + 1);
    spaceIndex = str.indexOf(" ", maxLen);
  }

  newStr.push(str); // Push the remaining part of the string

  return newStr.join("<br>");
}

function breakSentences(str: string) {
  const sentences = str.endsWith(".") ? str.slice(0, -1).split(". ") : str.split(". ");
  if (sentences.length <= 1) {
    return str;
  }
  return sentences.join(".<br><br>");
}
