import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";

export const incentivize = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.info(`Received '/incentivize' command from user: ${sender}`);

  if (!payload.issue) {
    logger.info(`Skipping '/incentivize' because of no issue instance`);
    return `Skipping '/incentivize' because of no issue instance`;
  }
  const toggle = body.match(/^\/incentivize @(\w+)/);
  if (!toggle) {
    return `invalid syntax for /incentivize \n usage /incentivize @user @user1... true|false \n ex /incentivize @user true`;
  } else {
    return;
  }
};
