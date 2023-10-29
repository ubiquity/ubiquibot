import Runtime from "../../bindings/bot-runtime";
import { Comment, Payload, Context } from "../../types";
import { commentParser, userCommands } from "./handlers";
import { verifyFirstCommentInRepository } from "./handlers/first";

export async function commentCreatedOrEdited(context: Context) {
  const runtime = Runtime.getState(),
    config = context.config,
    logger = runtime.logger,
    payload = context.event.payload as Payload;

  const comment = payload.comment as Comment;

  const body = comment.body;
  const commentedCommand = commentParser(context, body);

  if (!comment) {
    logger.info(`Comment is null. Skipping`);
  }
  const issue = payload.issue;
  if (!issue) {
    throw logger.error("Issue is null. Skipping", { issue });
  }

  if (commentedCommand) {
    await verifyFirstCommentInRepository(context);
  }

  const allCommands = userCommands(context);
  const userCommand = allCommands.find((i) => i.id == commentedCommand);

  if (userCommand) {
    const { id, handler } = userCommand;
    logger.info("Running a comment handler", { id, handler: handler.name });

    const feature = config.command.find((e) => e.name === id.split("/")[1]);

    if (feature?.enabled === false && id !== "/help") {
      return logger.warn("Skipping because it is disabled on this repo.", { id });
    }

    return await handler(context, body);
  } else {
    const sanitizedBody = body.replace(/<!--[\s\S]*?-->/g, "");
    return logger.verbose("I do not understand how to respond to that command", { sanitizedBody });
  }
}
