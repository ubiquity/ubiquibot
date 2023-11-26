import { Context } from "../../../../types/context";
import { Comment, User } from "../../../../types/payload";
import { CommentScoring } from "./comment-scoring-rubric";

export function perUserCommentScoring(
  context: Context,
  user: User,
  comments: Comment[],
  scoringRubric: CommentScoring
): CommentScoring {
  for (const comment of comments) {
    scoringRubric.computeWordScore(context, comment, user.id);
    scoringRubric.computeElementScore(context, comment, user.id);
  }
  scoringRubric.compileTotalUserScores();
  return scoringRubric;
}
