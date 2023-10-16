import Runtime from "../../bindings/bot-runtime";
import { Comment, Payload } from "../../types";
import { IssueCommentCommand } from "./commands";
import { commentParser, userCommands } from "./handlers";
import { verifyFirstCommentInRepository } from "./handlers/first";

export async function commentCreatedOrEdited() {
  const runtime = Runtime.getState(),
    config = runtime.botConfig,
    logger = runtime.logger,
    context = runtime.eventContext,
    payload = context.payload as Payload;

  const comment = payload.comment as Comment;

  const body = comment.body;
  const commentedCommand = commentParser(body);

  if (!comment) {
    logger.info(`Comment is null. Skipping`);
  }
  const issue = payload.issue;
  if (!issue) {
    throw logger.error("Issue is null. Skipping", { issue });
  }

  if (commentedCommand) {
    await verifyFirstCommentInRepository();
  }

  const allCommands = userCommands();
  const userCommand = allCommands.find((i) => i.id == commentedCommand);

  if (userCommand) {
    const { id, handler } = userCommand;
    logger.info("Running a comment handler", { id, handler: handler.name });

    const feature = config.command.find((e) => e.name === id.split("/")[1]);

    if (feature?.enabled === false && id !== IssueCommentCommand.HELP) {
      logger.info("Skipping because it is disabled on this repo.", { id });
    }

    const callbackComment = await handler(body);

    console.trace(callbackComment);

    if (callbackComment) {
      return callbackComment;
    }
  } else {
    return logger.debug("No command found in comment", { body });
  }
  return logger.info("Finished handling a comment on issue", { issue: payload.issue?.number });
}
