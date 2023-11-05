import Decimal from "decimal.js";
import Runtime from "../../../../bindings/bot-runtime";
import { CommentScoring } from "./comment-scoring-rubric";
import { CommentScoreDetails, ScoreDetails, ScoresByUser } from "./issue-shared-types";

export function relevanceAndFormatScoring(
  relevanceScore: { commentId: number; userId: number; score: Decimal }[],
  formatScore: CommentScoring[]
): ScoresByUser {
  const detailedSource = {} as ScoreDetails;

  relevanceScore.forEach((relevance) => {
    formatScore.forEach((format) => {
      // const { commentId, userId, score: relevanceScore } = relevanceScore;

      const usersQuantityScores = format.commentScores[relevance.userId];
      if (!usersQuantityScores) return;
      const userCommentScore = usersQuantityScores[relevance.commentId];
      if (!userCommentScore) throw Runtime.getState().logger.error("userCommentScore is undefined");

      const wordAndFormatScore = userCommentScore.wordScoreTotal.plus(userCommentScore.formatScoreTotal);

      const commentScoreDetails: CommentScoreDetails = {
        commentId: relevance.commentId,
        // wordAndFormattingScoreTotal: wordAndFormatScore,
        relevanceScore: relevance.score,
        finalScore: wordAndFormatScore.times(relevance.score),
        wordScore: userCommentScore.wordScoreTotal,
        formattingScore: userCommentScore.formatScoreTotal,
        wordScoreDetails: userCommentScore.wordScoreDetails || null,
        formattingScoreDetails: userCommentScore.formatScoreDetails || null,
      };

      if (!detailedSource[userId]) {
        detailedSource[userId] = [commentScoreDetails];
      }

      detailedSource[userId].total = detailedSource[userId].total.plus(wordAndFormatScore.times(relevance));
      // finalScores[userId].total = finalScores[userId].total.plus(comment.finalScore);
      detailedSource[userId].role = format.contributionClass;
      detailedSource[userId].comments.push(commentScoreDetails);
    });
  });

  return detailedSource;
}
