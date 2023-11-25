import { Context } from "../../../types/context";
import { Payload } from "../../../types/payload";
import { generateHelpMenu } from "./help";

export async function verifyFirstCommentInRepository(context: Context) {
  const payload = context.event.payload as Payload;
  if (!payload.issue) {
    throw context.logger.error("Issue is null. Skipping", { issue: payload.issue }, true);
  }
  const {
    features: {
      newContributorGreeting: { header, footer, enabled: isEnabled },
    },
  } = context.config;
  const responseIssue = await context.event.octokit.rest.search.issuesAndPullRequests({
    q: `is:issue repo:${payload.repository.owner.login}/${payload.repository.name} commenter:${payload.sender.login}`,
    per_page: 2,
  });
  const responsePr = await context.event.octokit.rest.search.issuesAndPullRequests({
    q: `is:pull-request repo:${payload.repository.owner.login}/${payload.repository.name} commenter:${payload.sender.login}`,
    per_page: 2,
  });
  if (responseIssue.data.total_count + responsePr.data.total_count === 1) {
    //continue_first_search
    const data = responseIssue.data.total_count > 0 ? responseIssue.data : responsePr.data;
    const resp = await context.event.octokit.rest.issues.listComments({
      issue_number: data.items[0].number,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      per_page: 100,
    });
    const isFirstComment = resp.data.filter((item) => item.user?.login === payload.sender.login).length === 1;
    if (isFirstComment && isEnabled) {
      return [header, generateHelpMenu(context), `@${payload.sender.login}`, footer].join("\n");
      // await upsertCommentToIssue(payload.issue.number, msg, payload.action, payload.comment);
    }
  }
  return context.logger.info(`Skipping first comment`);
}
