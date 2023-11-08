import { CommentScoring } from "./comment-scoring-rubric";
import { EnrichedRelevance } from "./evaluate-comments";

// this can be used in two contexts:
// 1. to score an array of comments
// 2. to score an issue specification

export function addRelevanceAndFormatScoring(
  relevanceScore: EnrichedRelevance[],
  formatScore: CommentScoring[]
): CommentScoring[] {
  // this only needs to associate the relevance score with the format score

  // const details = [] as UserScoreDetails[];

  for (let i = 0; i < formatScore.length; i++) {
    const userScore = formatScore[i];
    for (const userId in userScore.commentScores) {
      const userCommentScores = userScore.commentScores[userId];
      for (const commentId in userCommentScores.details) {
        const commentDetails = userCommentScores.details[commentId];
        const relevance = relevanceScore.find(
          (r) => r.comment.id === parseInt(commentId) && r.user.id === parseInt(userId)
        );
        if (relevance) {
          commentDetails.relevanceScoreComment = relevance.score;
        }
      }
    }
  }

  return formatScore;
}

/*
relevanceScore {
  comment: Comment;
  user: User;
  score: Decimal;
}
*/

/*
formatScore {
contributionClass: ContributorClassNames;
  roleWordScore: Decimal;
  roleWordScoreMultiplier!: number;
  commentScores: {
    [userId: number]: {
      totalScore: Decimal;
      wordScoreTotal: Decimal;
      formatScoreTotal: Decimal;
      details: {
        [commentId: number]: {
          wordScoreComment: Decimal;
          wordScoreCommentDetails: { [word: string]: Decimal };
          formatScoreComment: Decimal;
          formatScoreCommentDetails: {
            [tagName in Tags]?: {
              count: number;
              score: Decimal;
              words: number;
            };
          };
        };
      };
    };
  }
}
*/
