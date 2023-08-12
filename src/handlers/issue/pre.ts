import { extractImportantWords, countIncludedWords, upsertCommentToIssue, listIssuesForRepo } from "../../helpers";
import { getBotContext } from "../../bindings";
import { Payload } from "../../types";

export const findDuplicateOne = async () => {
  const { payload: _payload } = getBotContext();
  const issue = (_payload as Payload).issue;

  if (!issue?.body) return;
  const importantWords = await extractImportantWords();
  const wordCount = importantWords.length;
  let fetchDone = false;
  const perPage = 10;
  let curPage = 1;
  while (!fetchDone) {
    const issues = await listIssuesForRepo("all", perPage, curPage, "created", "asc");
    for (const iss of issues) {
      if (iss.body && iss.number != issue.number) {
        const probability = (countIncludedWords(iss.body, importantWords) * 100.0) / wordCount;
        if (probability > parseInt(process.env.SIMILARITY_THRESHOLD || "80")) {
          if (issue.number) {
            await upsertCommentToIssue(issue.number, `Similar issue (${iss.title}) found at ${iss.html_url}.\nSimilarity is about ${probability}%`, "created");
            return;
          }
        }
      }
    }
    if (issues.length < perPage) fetchDone = true;
    else curPage++;
  }
};
