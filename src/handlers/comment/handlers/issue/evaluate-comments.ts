import Decimal from "decimal.js";

import { Context } from "../../../../types/context";
import { Comment, Issue } from "../../../../types/payload";
import { formatScoring } from "./format-scoring";
import { ScoresByUser } from "./issue-shared-types";
import { relevanceAndFormatScoring } from "./relevance-format-scoring";
import { relevanceScoring } from "./relevance-scoring";

export async function evaluateComments({
  context,
  issue,
  source,
}: {
  context: Context;
  issue: Issue;
  source: Comment[];
}): Promise<ScoresByUser[]> {
  const relevance = await relevanceScoring(issue, source); // the issue specification is not included in this array scoring, it is only for the other contributor comments
  const relevanceWithMetaData = relevance.score.map(enrichRelevanceData(source));
  const formatting = await formatScoring(context, issue, source);
  const score = relevanceAndFormatScoring(relevanceWithMetaData, formatting);

  const result = score.map((score: { userId: number; commentId: number; score: Decimal }) => ({
    class: "Issue Contributor Comment",
    userId: score.userId,
    username: source.find((comment) => comment.id === score.commentId)?.user.login ?? "unknown",
    score: score.score,
    scoring: {
      comment: score,
      specification: null,
      task: null,
    },
    source: {
      comment: source,
      issue: issue,
    },
  }));
  return result;
}

export function enrichRelevanceData(
  contributorComments: Comment[]
): (value: Decimal, index: number, array: Decimal[]) => { commentId: number; userId: number; score: Decimal } {
  return (score, index) => ({
    commentId: contributorComments[index].id,
    userId: contributorComments[index].user.id,
    score,
  });
}
