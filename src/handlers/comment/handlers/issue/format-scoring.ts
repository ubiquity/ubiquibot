import { Comment, Context, Issue } from "../../../../types";
import { allCommentScoring } from "./specification-scoring";

export async function formatScoring(context: Context, issue: Issue, contributorComments: Comment[]) {
  // _calculateSpecificationScore(issue.body, specificationScoringRubric);
  const scoringRubrics = await allCommentScoring({ context, issue, proof: contributorComments });
  return scoringRubrics;
}
