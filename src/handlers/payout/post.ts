import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { getAllIssueComments } from "../../helpers";
import { Payload } from "../../types";

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
};
