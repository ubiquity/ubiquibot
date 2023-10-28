import Runtime from "../../../bindings/bot-runtime";
import { Payload } from "../../../types";
import { generateHelpMenu } from "./help";

export async function verifyFirstCommentInRepository() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const payload = runtime.latestEventContext.payload as Payload;
  if (!payload.issue) {
    throw runtime.logger.error("Issue is null. Skipping", { issue: payload.issue }, true);
  }
  const {
    newContributorGreeting: { header, footer },
  } = Runtime.getState().botConfig;

  const commented = await context.octokit.rest.search.issuesAndPullRequests({
    q: `repo:${payload.repository.owner.login}/${payload.repository.name} commenter:${payload.sender.login}`,
    per_page: 2,
  });

  if (commented.data.total_count) {
    const comments = await context.octokit.rest.issues.listComments({
      issue_number: commented.data.items[0].number,
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      per_page: 100,
    });
    const isFirstComment = comments.data.filter((item) => item.user?.login === payload.sender.login).length === 1;
    if (isFirstComment && (header || footer)) {
      return [header, generateHelpMenu(), "@".concat(payload.sender.login), footer].join("\n");
    }
  }
  return runtime.logger.info(`Skipping first comment`);
}
