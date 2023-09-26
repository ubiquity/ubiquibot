import { getBotContext, getLogger } from "../../../bindings";
import { Payload } from "../../../types";

export const commentIncentive = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.info(`Received '/comment-incentive' command from user: ${sender}`);

  if (!payload.issue) {
    logger.info(`Skipping '/comment-incentive' because of no issue instance`);
    return `Skipping '/comment-incentive' because of no issue instance`;
  }
  var toggle = body.match(/\b(true|false)\b/);
  if (!toggle) {
    return `invalid syntax for /comment-incentive \n usage /comment-incentive @user @user1... true|false \n ex /comment-incentive @user true`;
  } else {
    return;
  }
};
