import { Comment, Issue } from "../../../../types/payload";
import { _calculateAllCommentScores } from "./_calculateAllCommentScores";

export async function calculateQuantScore(issue: Issue, contributorComments: Comment[]) {
  // _calculateSpecificationScore(issue.body, specificationScoringRubric);
  await _calculateAllCommentScores(issue, contributorComments);
}

// function _calculateSpecificationScore(specification: string, rubric: SpecificationScoringRubric) {
// TODO: implement
// }
