import { Comment, Context, Issue } from "../../../../types";
import { _calculateAllCommentScores } from "./_calculate-all-comment-scores";

export async function calculateQuantScore(context: Context, issue: Issue, contributorComments: Comment[]) {
  // _calculateSpecificationScore(issue.body, specificationScoringRubric);
  const scoringRubrics = await _calculateAllCommentScores(context, issue, contributorComments);
  return scoringRubrics;
}
