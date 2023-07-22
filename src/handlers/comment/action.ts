import { getBotContext, getLogger } from "../../bindings";
import { Payload } from "../../types";
import { commentParser, userCommands } from "./handlers";
import { verifyFirstCheck } from "./handlers/first";

export const handleComment = async (): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  logger.info(`Handling an issue comment on issue ${payload.issue?.number}`);
  const comment = payload.comment;
  if (!comment) {
    logger.info(`Comment is null. Skipping`);
    return;
  }

  const body = comment.body;
  const commands = commentParser(body);

  if (commands.length === 0) {
    await verifyFirstCheck();
    return;
  }

  for (const command of commands) {
    const userCommand = userCommands.find((i) => i.id == command);

    if (userCommand) {
      const { handler, callback, successComment, failureComment } = userCommand;
      logger.info(`Running a comment handler: ${handler.name}`);

      const { payload: _payload } = getBotContext();
      const issue = (_payload as Payload).issue;
      if (!issue) continue;

      try {
        const response = await handler(body);
        const callbackComment = response ?? successComment ?? "";
        if (callbackComment) await callback(issue.number, callbackComment);
      } catch (err: unknown) {
        // Use failureComment for failed command if it is available
        if (failureComment) {
          await callback(issue.number, failureComment);
        }
        await callback(issue.number, `Error: ${err}`);
      }
    } else {
      logger.info(`Skipping for a command: ${command}`);
    }
  }
};
