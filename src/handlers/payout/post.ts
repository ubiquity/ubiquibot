import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { getAllIssueComments, parseComments } from "../../helpers";
import { Payload, UserType } from "../../types";

/**
 * Incentivize the contributors based on their contribution.
 * The default formula has been defined in https://github.com/ubiquity/ubiquibot/issues/272
 */
export const incentiveContribution = async () => {
  const logger = getLogger();
  const {
    mode: { incentiveMode },
  } = getBotConfig();
  if (!incentiveMode) {
    logger.info(`No incentive mode. skipping to process`);
    return;
  }
  const context = getBotContext();
  const payload = context.payload as Payload;
  const issueComments = await getAllIssueComments(payload.issue?.number!);
  const issueCommentsByUser: Record<string, string[]> = {};
  for (const issueComment of issueComments) {
    const user = issueComment.user;
    issueCommentsByUser[user.login].push(issueComment.body);
  }

  for (const user of Object.keys(issueCommentsByUser)) {
    const comments = issueCommentsByUser[user];
    parseComments(comments);
  }
};
