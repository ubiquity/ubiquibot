import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { Payload } from "../../types";
import { IssueCommentCommands } from "./commands";
import { commentParser, userCommands } from "./handlers";
import { verifyFirstCheck } from "./handlers/first";

export const handleComment = async (): Promise<void> => {
  const context = getBotContext();
  const config = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;

  logger.info(`Handling an issue comment on issue ${payload.issue?.number}`);
  const comment = payload.comment;
  if (!comment) {
    logger.info(`Comment is null. Skipping`);
    return;
  }

  const body = comment.body;
  const commentedCommands = commentParser(body);

  if (commentedCommands.length === 0) {
    await verifyFirstCheck();
    return;
  }

  const allCommands = userCommands();
  for (const command of commentedCommands) {
    const userCommand = allCommands.find((i) => i.id == command);

    if (userCommand) {
      const { id, handler, callback, successComment, failureComment } = userCommand;
      logger.info(`Running a comment handler: ${handler.name}`);

      const { payload: _payload } = getBotContext();
      const issue = (_payload as Payload).issue;
      if (!issue) continue;

      const feature = config.command.find((e) => e.name === id.split("/")[1]);

      if (!feature?.enabled && id !== IssueCommentCommands.HELP) {
        logger.info(`Skipping '${id}' because it is disabled on this repo.`);
        await callback(issue.number, `Skipping \`${id}\` because it is disabled on this repo.`, payload.action, payload.comment);
        continue;
      }

      try {
        const response = await handler(body);
        const callbackComment = response ?? successComment ?? "";
        if (callbackComment) await callback(issue.number, callbackComment, payload.action, payload.comment);
      } catch (err: unknown) {
        // Use failureComment for failed command if it is available
        if (failureComment) {
          await callback(issue.number, failureComment, payload.action, payload.comment);
        }
        await callback(issue.number, `Error: ${err}`, payload.action, payload.comment);
      }
    } else {
      logger.info(`Skipping for a command: ${command}`);
    }
  }
};
