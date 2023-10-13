// import { extractImportantWords, upsertCommentToIssue, measureSimilarity } from "../../helpers";
import Runtime from "../../bindings/bot-runtime";
// import { Issue, Payload } from "../../types";

export async function findDuplicateIssue() {
  const runtime = Runtime.getState();
  // const context = runtime.eventContext;
  const logger = runtime.logger;
  // const payload = context.payload as Payload;
  // const issue = payload.issue;

  logger.warn(`skipping "find duplicate issue" due to poor implementation`);

  // if (!issue?.body) {
  //   return logger.error("Issue body is empty", issue);
  // }
  // const importantWords = await extractImportantWords(issue);
  // const perPage = 10;
  // let curPage = 1;

  // for (const importantWord of importantWords) {
  //   let fetchDone = false;
  //   while (!fetchDone) {
  //     const response = await context.octokit.rest.search.issuesAndPullRequests({
  //       q: `${importantWord} repo:${payload.repository.owner.login}/${payload.repository.name} is:issue`,
  //       sort: "created",
  //       order: "desc",
  //       per_page: perPage,
  //       page: curPage,
  //     });
  //     if (response.data.items.length > 0) {
  //       for (const result of response.data.items) {
  //         if (!result.body) continue;
  //         if (result.id === issue.id) continue;
  //         const similarity = await measureSimilarity(issue, result as Issue);
  //         if (similarity > parseInt(process.env.SIMILARITY_THRESHOLD || "80")) {
  //           await upsertCommentToIssue(
  //             issue.number,
  //             `Similar issue (${result.title}) found at ${result.html_url}.\nSimilarity is about ${similarity}%`,
  //             "created"
  //           );
  //           return;
  //         }
  //       }
  //     }
  //     if (response.data.items.length < perPage) fetchDone = true;
  //     else curPage++;
  //   }
  // }
  // return logger.info("No similar issue found");
}
