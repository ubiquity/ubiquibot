import { calculateQualScore } from "./calculate-quality-score";
import { CommentScore } from "./issue-closed";
// Define your types and interfaces as before...

// Your CommentScoringConfig
const config: CommentScoringConfig = {
  wordCredit: 1,
  listItemCredit: 2,
  imageCredit: 3,
  linkCredit: 2,
  codeBlockCredit: 4,
};

// When processing each comment
export function processComment(comment: string, qualitativeScore: number): CommentScore {
  const quantitativeScore = calculateQualScore(comment, config);
  const finalScore = calculateFinalScore(qualitativeScore, quantitativeScore);

  return {
    qualitative: qualitativeScore,
    quantitative: quantitativeScore,
    finalScore,
  };
}

function calculateFinalScore(qualitative: number, quantitative: number): number {
  return qualitative * quantitative;
}
