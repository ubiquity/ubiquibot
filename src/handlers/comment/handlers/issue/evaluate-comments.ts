import Decimal from "decimal.js";

import { Context } from "../../../../types/context";
import { Comment, Issue, User } from "../../../../types/payload";
import { allCommentScoring } from "./allCommentScoring";
import { UserScoreDetails } from "./issue-shared-types";
import { relevanceAndFormatScoring } from "./relevance-format-scoring";
import { relevanceScoring } from "./relevance-scoring";

export async function commentsScoring({
  context,
  issue,
  source,
}: {
  context: Context;
  issue: Issue;
  source: Comment[];
}): Promise<UserScoreDetails[]> {
  const relevance = await relevanceScoring(issue, source);
  const relevanceWithMetaData = relevance.score.map(enrichRelevanceData(source));
  const formatting = await allCommentScoring({ context, issue, proof: source });
  const scoresByUser = relevanceAndFormatScoring({
    relevanceScore: relevanceWithMetaData,
    formatScore: formatting,
    issue,
  });

  // const result: UserScoreDetails[] = Object.entries(scoresByUser).map(([userId, score]) => ({ [userId]: score }));

  return result;
}

export interface EnrichedRelevance {
  comment: Comment;
  user: User;
  score: Decimal;
}

export function enrichRelevanceData(
  contributorComments: Comment[]
): (value: Decimal, index: number, array: Decimal[]) => EnrichedRelevance {
  return (score, index) => ({
    comment: contributorComments[index],
    user: contributorComments[index].user,
    score,
  });
}
