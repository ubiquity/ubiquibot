import { Context } from "../../types/context";
import { GitHubComment, GitHubPayload } from "../../types/payload";
import { commentParser, userCommands } from "./handlers/comment-handler-main";
import { verifyFirstCommentInRepository } from "./handlers/first";

export async function commentCreated(context: Context) {
  const config = context.config,
    logger = context.logger,
    payload = context.event.payload as GitHubPayload;

  const comment = payload.comment as GitHubComment;

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
    await verifyFirstCommentInRepository(context);
  }

  const allCommands = userCommands(config.miscellaneous.registerWalletWithVerification);
  const userCommand = allCommands.find((i) => i.id == commentedCommand);

  if (userCommand) {
    const { id, handler } = userCommand;
    logger.info("Running a comment handler", { id, handler: handler.name });

    const isDisabled = config.disabledCommands.some((command) => command === id.replace("/", ""));

    if (isDisabled && id !== "/help") {
      return logger.error("Skipping because it is disabled on this repo.", { id });
    }

    return await handler(context, body);
  } else {
    const sanitizedBody = body.replace(/<!--[\s\S]*?-->/g, "");
    return logger.verbose("Comment event received without a recognized user command.", {
      sanitizedBody,
    });
  }
}
