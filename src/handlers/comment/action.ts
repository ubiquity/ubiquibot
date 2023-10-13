import Runtime from "../../bindings/bot-runtime";
import { Comment, Payload } from "../../types";
import { IssueCommentCommands } from "./commands";
import { commentParser, userCommands } from "./handlers";
import { verifyFirstCommentInRepository } from "./handlers/first";

export async function handleComment() {
  const runtime = Runtime.getState(),
    config = runtime.botConfig,
    logger = runtime.logger,
    context = runtime.eventContext,
    payload = context.payload as Payload;

  // logger.info(`Handling an issue comment on issue ${payload.issue?.number}`);
  const comment = payload.comment as Comment;
  if (!comment) {
    return logger.info(`Comment is null. Skipping`);
  }

  const body = comment.body;
  const commentedCommands = commentParser(body);

  if (commentedCommands.length === 0) {
    return await verifyFirstCommentInRepository();
  }

  const allCommands = userCommands();
  for (const command of commentedCommands) {
    const userCommand = allCommands.find((i) => i.id == command);

    if (userCommand) {
      const { id, handler, callback } = userCommand;
      logger.info(`Running a comment handler: ${handler.name}`);
      const issue = payload.issue;
      if (!issue) {
        throw logger.error("Issue is null. Skipping", { issue });
      }

      const feature = config.command.find((e) => e.name === id.split("/")[1]);

      if (feature?.enabled === false && id !== IssueCommentCommands.HELP) {
        logger.info(`Skipping '${id}' because it is disabled on this repo.`);
        await callback(
          issue.number,
          `Skipping \`${id}\` because it is disabled on this repo.`,
          payload.action,
          payload.comment
        );
        continue;
      }

      const callbackComment = await handler(body);
      if (callbackComment) {
        console.trace("this might be double diffing comments but probably not.");
        await callback(issue.number, callbackComment, payload.action, payload.comment);
      }
    } else {
      logger.info(`Skipping for a command: ${command}`);
    }
  }
  return logger.info(`Finished handling an issue comment on issue ${payload.issue?.number}`);
}
