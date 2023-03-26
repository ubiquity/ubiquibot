import { getBotContext, getLogger } from "../../../bindings";
import { COMMAND_INSTRUCTIONS } from "../../../configs";
import { addCommentToIssue } from "../../../helpers";
import { Payload } from "../../../types";

export const verifyFirstCheck = async (): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  try {
    const response = await context.octokit.rest.search.issuesAndPullRequests({
      q: `is:issue repo:${payload.repository.owner.login}/${payload.repository.name} commenter:${payload.sender.login}`,
      per_page: 2,
    });
    if (response.data.total_count >= 2) {
      const msg = `${COMMAND_INSTRUCTIONS}\n@${payload.sender.login}`;
      await addCommentToIssue(msg, payload.issue!.number);
    }
  } catch (error: unknown) {
    logger.info(`First comment verification failed, reason: ${error}`);
  }
};
