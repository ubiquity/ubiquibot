import { Comment, User } from "../../../../types/payload";
import { CommentScoring } from "./comment-scoring-rubric";

export function perUserCommentScoring(user: User, comments: Comment[], scoringRubric: CommentScoring): CommentScoring {
  for (const comment of comments) {
    scoringRubric.computeWordScore(comment, user.id);
    scoringRubric.computeElementScore(comment, user.id);
  }
  scoringRubric.compileTotalUserScores();
  return scoringRubric;
}
