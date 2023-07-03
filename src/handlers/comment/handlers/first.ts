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
    if (response.data.total_count === 1) {
      //continue_first_search
      const resp = await context.octokit.rest.issues.listComments({
        issue_number: response.data.items[0].number,
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        per_page: 100,
      });
      const isFirstComment = resp.data.filter((item) => item.user?.login === payload.sender.login).length === 1;
      if (isFirstComment) {
        //first_comment
        const msg = `${COMMAND_INSTRUCTIONS}\n@${payload.sender.login}`;
        await addCommentToIssue(msg, payload.issue!.number);
      }
    }
  } catch (error: unknown) {
    logger.info(`First comment verification failed, reason: ${error}`);
  }
};
