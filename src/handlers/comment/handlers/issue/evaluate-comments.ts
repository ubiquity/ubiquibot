import Decimal from "decimal.js";

import { Context } from "../../../../types/context";
import { Comment, Issue, User } from "../../../../types/payload";
import { allCommentScoring } from "./allCommentScoring";
import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorView } from "./contribution-style-types";
import { UserScoreDetails } from "./issue-shared-types";
import { addRelevanceAndFormatScoring } from "./relevance-format-scoring";
import { relevanceScoring } from "./relevance-scoring";

export async function commentsScoring({
  context,
  issue,
  source,
  view,
}: {
  context: Context;
  issue: Issue;
  source: Comment[];
  view: ContributorView;
}): Promise<UserScoreDetails[]> {
  const relevance = await relevanceScoring(context, issue, source);
  const relevanceWithMetaData = relevance.score.map(enrichRelevanceData(source));

  const formatting: CommentScoring[] = await allCommentScoring({ context, issue, comments: source, view });
  const formattingWithRelevance: CommentScoring[] = addRelevanceAndFormatScoring(relevanceWithMetaData, formatting);

  const userScoreDetails = formattingWithRelevance.reduce((acc, commentScoring) => {
    for (const userId in commentScoring.commentScores) {
      const userScore = commentScoring.commentScores[userId];

      const userScoreDetail: UserScoreDetails = {
        score: userScore.totalScoreTotal,
        view,
        role: null,
        contribution: "Comment",
        scoring: {
          issueComments: view === "Issue" ? commentScoring : null,
          reviewComments: view === "Review" ? commentScoring : null,
          specification: null,
          task: null,
        },
        source: {
          issue,
          user: Object.values(userScore.details)[0].comment.user,
        },
      };

      acc.push(userScoreDetail);
    }
    return acc;
  }, [] as UserScoreDetails[]);

  return userScoreDetails;
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
