import Decimal from "decimal.js";
import Runtime from "../../../../bindings/bot-runtime";
import { CommentScoringRubric } from "./comment-scoring-rubric";
import { FinalScores } from "./evaluate-comments";

export function relevanceAndFormatScoring(
  relevance: { commentId: number; userId: number; score: Decimal }[],
  formatting: CommentScoringRubric[]
) {
  const finalScores = {} as FinalScores;

  relevance.forEach(({ commentId, userId, score }) => {
    formatting.forEach((scoringRubric) => {
      const usersQuantityScores = scoringRubric.commentScores[userId];
      if (!usersQuantityScores) return;
      const userCommentScore = usersQuantityScores[commentId];
      if (!userCommentScore) throw Runtime.getState().logger.error("userCommentScore is undefined");

      const quantityScore = userCommentScore.wordScoreTotal.plus(userCommentScore.elementScoreTotal);

      if (!finalScores[userId]) {
        finalScores[userId] = {
          role: scoringRubric.role,
          total: new Decimal(0),
          comments: [],
        };
      }

      const comment = {
        commentId: commentId,
        wordAndElementScoreTotal: quantityScore,
        qualityScore: score,
        finalScore: quantityScore.times(score),
        wordScoreTotal: userCommentScore.wordScoreTotal,
        elementScoreTotal: userCommentScore.elementScoreTotal,
        wordScoreDetails: userCommentScore.wordScoreDetails || null,
        elementScoreDetails: userCommentScore.elementScoreDetails || null,
      };

      finalScores[userId].total = finalScores[userId].total.plus(quantityScore.times(score));
      // finalScores[userId].total = finalScores[userId].total.plus(comment.finalScore);
      finalScores[userId].role = scoringRubric.role;
      finalScores[userId].comments.push(comment);
    });
  });

  return finalScores;
}
