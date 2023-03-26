import { getBotContext, getLogger } from "../../bindings";
import { Payload } from "../../types";
import { commandHandlers, commentParser } from "./handlers";
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
    if (commandHandlers[command]) {
      const handler = commandHandlers[command];
      logger.info(`Running a comment handler: ${handler.name}`);
      await handler(body);
    } else {
      logger.info(`Skipping for a command: ${command}`);
    }
  }
};
