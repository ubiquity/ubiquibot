import Decimal from "decimal.js";
import Runtime from "../../../../bindings/bot-runtime";
import { ScoringRubric } from "./scoring-rubric";
import { FinalScores } from "./calculateQualityAndQuantityScores";

export function applyQualityScoreToQuantityScore(
  qualityScoresWithCommentIds: { commentId: number; userId: number; score: Decimal }[],
  quantityScore: ScoringRubric[]
) {
  const finalScores = {} as FinalScores;

  qualityScoresWithCommentIds.forEach(({ commentId, userId, score }) => {
    quantityScore.forEach((scoringRubric) => {
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
