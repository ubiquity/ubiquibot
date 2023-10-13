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
  if (!comment) {
    logger.info(`Comment is null. Skipping`);
  }

  const body = comment.body;
  const commentedCommand = commentParser(body);

  if (commentedCommand) {
    await verifyFirstCommentInRepository();
  }

  const allCommands = userCommands();
  const userCommand = allCommands.find((i) => i.id == commentedCommand);

  if (userCommand) {
    const { id, handler, callback } = userCommand;
    logger.info(`Running a comment handler: ${handler.name}`);
    const issue = payload.issue;
    if (!issue) {
      throw logger.error("Issue is null. Skipping", { issue });
    }

    const feature = config.command.find((e) => e.name === id.split("/")[1]);

    if (feature?.enabled === false && id !== IssueCommentCommand.HELP) {
      logger.info(`Skipping '${id}' because it is disabled on this repo.`);
      await callback(
        issue.number,
        `Skipping \`${id}\` because it is disabled on this repo.`,
        payload.action,
        payload.comment
      );
    }

    const callbackComment = await handler(body);
    if (callbackComment) {
      logger.info(`Command callback comment:`, callbackComment);
      await callback(issue.number, callbackComment, payload.action, payload.comment);
    }
  } else {
    logger.info(`Skipping for a command: ${commentedCommand}`);
  }
  logger.info(`Finished handling an issue comment on issue ${payload.issue?.number}`);
}
