import Decimal from "decimal.js";
import { Comment, Issue } from "../../../../types/payload";
import { applyQualityScoreToQuantityScore } from "./applyQualityScoreToQuantityScore";
import { calculateQualScore } from "./calculate-quality-score";
import { calculateQuantScore } from "./calculate-quantity-score";
import { ContributionStyles } from "./_calculate-all-comment-scores";

export async function calculateQualityAndQuantityScores(
  issue: Issue,
  contributorComments: Comment[]
): Promise<FinalScores> {
  const qualityScore = await calculateQualScore(issue, contributorComments); // the issue specification is not included in this array scoring, it is only for the other contributor comments
  const qualityScoresWithMetaData = qualityScore.relevanceScores.map(qualAndMeta());
  const quantityScore = await calculateQuantScore(issue, contributorComments);

  const totals = applyQualityScoreToQuantityScore(qualityScoresWithMetaData, quantityScore);
  return totals;

  function qualAndMeta(): (
    value: Decimal,
    index: number,
    array: Decimal[]
  ) => { commentId: number; userId: number; score: Decimal } {
    return (score, index) => ({
      commentId: contributorComments[index].id,
      userId: contributorComments[index].user.id,
      score,
    });
  }
}

export interface FinalScores {
  [userId: number]: {
    role: ContributionStyles;
    total: Decimal;
    comments: CommentScoreDetails[];
  };
}
interface CommentScoreDetails {
  commentId: number;
  wordAndElementScoreTotal: Decimal;
  qualityScore: Decimal;
  finalScore: Decimal;
  wordScoreTotal: Decimal;
  elementScoreTotal: Decimal;
  wordScoreDetails: { [word: string]: Decimal } | null;
  elementScoreDetails: { [element: string]: { count: number; score: Decimal; words: number } } | null;
}
