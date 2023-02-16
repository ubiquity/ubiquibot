import { getBotContext } from "../../bindings";
import { Payload } from "../../types";
import { nullHandler } from "../shared";
import { commandHandlers, commentPaser } from "./handlers";

export const handleComment = async (): Promise<void> => {
  const context = getBotContext();
  const { log } = context;
  const payload = context.payload as Payload;

  log.info(`Handling an issue comment on issue ${payload.issue?.number}`);
  const comment = payload.comment;
  if (!comment) {
    log.info(`Comment is null. Skipping`);
    return;
  }

  const body = comment.body;
  const commands = commentPaser(body);

  // Run the command handlers in parallel
  await Promise.all(commands.map((command) => commandHandlers[command] ?? nullHandler));
};
