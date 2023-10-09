import Runtime from "../../../bindings/bot-runtime";
import { upsertCommentToIssue } from "../../../helpers";
import { Payload } from "../../../types";
import { generateHelpMenu } from "./help";

export async function verifyFirstCheck() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
  const payload = runtime.eventContext.payload as Payload;
  let msg = "";
  if (!payload.issue) return;
  const {
    newContributorGreeting: { header, helpMenu, footer, enabled },
  } = Runtime.getState().botConfig;
  try {
    const response_issue = await context.octokit.rest.search.issuesAndPullRequests({
      q: `is:issue repo:${payload.repository.owner.login}/${payload.repository.name} commenter:${payload.sender.login}`,
      per_page: 2,
    });
    const response_pr = await context.octokit.rest.search.issuesAndPullRequests({
      q: `is:pull-request repo:${payload.repository.owner.login}/${payload.repository.name} commenter:${payload.sender.login}`,
      per_page: 2,
    });
    if (response_issue.data.total_count + response_pr.data.total_count === 1) {
      //continue_first_search
      const data = response_issue.data.total_count > 0 ? response_issue.data : response_pr.data;
      const resp = await context.octokit.rest.issues.listComments({
        issue_number: data.items[0].number,
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        per_page: 100,
      });
      const isFirstComment = resp.data.filter((item) => item.user?.login === payload.sender.login).length === 1;
      if (isFirstComment && enabled) {
        //first_comment
        if (header) {
          msg += `${header}\n`;
        }
        if (helpMenu) {
          msg += `${generateHelpMenu()}\n@${payload.sender.login}\n`;
        }
        if (footer) {
          msg += `${footer}`;
        }
        await upsertCommentToIssue(payload.issue.number, msg, payload.action, payload.comment);
      }
    }
  } catch (error: unknown) {
    logger.info(`First comment verification failed, reason: ${error}`);
  }
}
