import { getBotContext, getLogger } from "../../../bindings";
import { getIncentivizedUsers } from "../../../helpers";
import { Payload } from "../../../types";

export const commentIncentive = async (body: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  logger.debug(`Received '/comment-incentive' command from user: ${sender}`);

  if (!payload.issue) {
    logger.info(`Skipping '/comment-incentive' because of no issue instance`);
    return `Skipping '/comment-incentive' because of no issue instance`;
  }
  const toggle = (body.includes("true") || body.includes("false")) && body.match(/@(\w+)/g);
  if (!toggle) {
    return `invalid syntax for /comment-incentive \n usage /comment-incentive @user @user1... true|false \n ex /comment-incentive @user true`;
  } else {
    let users = await getIncentivizedUsers(payload.issue.number);
    return JSON.stringify(users);
  }
};
