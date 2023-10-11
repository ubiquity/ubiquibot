import Runtime from "../../bindings/bot-runtime";
import { Comment, Payload } from "../../types";
import { IssueCommentCommands } from "./commands";
import { commentParser, userCommands } from "./handlers";
import { verifyFirstCheck } from "./handlers/first";
import { _renderErrorDiffWrapper } from "./handlers/";

export async function handleComment(): Promise<void> {
  const runtime = Runtime.getState(),
    config = runtime.botConfig,
    logger = runtime.logger,
    context = runtime.eventContext,
    payload = context.payload as Payload;

  // logger.info(`Handling an issue comment on issue ${payload.issue?.number}`);
  const comment = payload.comment as Comment;
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
      const { id, handler, callback } = userCommand;
      logger.info(`Running a comment handler: ${handler.name}`);
      const issue = payload.issue;
      if (!issue) {
        throw logger.error("Issue is null. Skipping");
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

      try {
        const callbackComment = await handler(body);
        if (callbackComment) {
          await callback(issue.number, callbackComment, payload.action, payload.comment);
        }
      } catch (err) {
        return await _renderErrorDiffWrapper(err, issue);
      }
    } else {
      logger.info(`Skipping for a command: ${command}`);
    }
  }
}
