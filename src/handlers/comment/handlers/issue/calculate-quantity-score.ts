import { Comment, Issue } from "../../../../types/payload";
import { _calculateAllCommentScores } from "./_calculate-all-comment-scores";

export async function calculateQuantScore(issue: Issue, contributorComments: Comment[]) {
  // _calculateSpecificationScore(issue.body, specificationScoringRubric);
  const scoringRubrics = await _calculateAllCommentScores(issue, contributorComments);
  return scoringRubrics;
}

// function _calculateSpecificationScore(specification: string, rubric: SpecificationScoringRubric) {
// TODO: implement
// }
