import { extractImportantWords, upsertCommentToIssue, measureSimilarity } from "../../helpers";
import { getLogger } from "../../bindings";
import { BotContext, Issue, Payload } from "../../types";

export const findDuplicateOne = async (context: BotContext) => {
  const logger = getLogger();
  const payload = context.payload as Payload;
  const issue = payload.issue;

  if (!issue?.body) return;
  const importantWords = await extractImportantWords(issue);
  const perPage = 10;
  let curPage = 1;

  for (const importantWord of importantWords) {
    let fetchDone = false;
    try {
      while (!fetchDone) {
        const response = await context.octokit.rest.search.issuesAndPullRequests({
          q: `${importantWord} repo:${payload.repository.owner.login}/${payload.repository.name} is:issue`,
          sort: "created",
          order: "desc",
          per_page: perPage,
          page: curPage,
        });
        if (response.data.items.length > 0) {
          for (const result of response.data.items) {
            if (!result.body) continue;
            if (result.id === issue.id) continue;
            const similarity = await measureSimilarity(issue, result as Issue);
            if (similarity > parseInt(process.env.SIMILARITY_THRESHOLD || "80")) {
              await upsertCommentToIssue(
                issue.number,
                `Similar issue (${result.title}) found at ${result.html_url}.\nSimilarity is about ${similarity}%`,
                "created"
              );
              return;
            }
          }
        }
        if (response.data.items.length < perPage) fetchDone = true;
        else curPage++;
      }
    } catch (e: unknown) {
      logger.error(`Could not find any issues, reason: ${e}`);
    }
  }
};
