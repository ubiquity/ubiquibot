import { Comment } from "../../../../types/payload";
import { commentScoringByContributionClass } from "./comment-scoring-by-contribution-style";
import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorClassesKeys, ContributorView } from "./contribution-style-types";
import { sortCommentsByClass } from "./filter-comments-by-contribution-type";
import { sortUsersByClass } from "./identify-user-ids";
import { perUserCommentScoring } from "./per-user-comment-scoring";

import { ContextIssue } from "./specification-scoring";
export async function allCommentScoring({
  context,
  issue,
  comments,
  view,
}: ContextIssue & { comments: Comment[]; view: ContributorView }): Promise<CommentScoring[]> {
  const usersByClass = await sortUsersByClass(context, issue, comments);
  const commentsByClass = sortCommentsByClass(usersByClass, comments, view);
  const contributionClasses = Object.keys(usersByClass).map((key) => key as ContributorClassesKeys);
  return contributionClasses
    .filter((className: string) => className.endsWith("Comment"))
    .flatMap((contributionStyle) => {
      const commentsOfRole = commentsByClass[contributionStyle as keyof typeof commentsByClass];
      const scoring = commentScoringByContributionClass[contributionStyle]();

      const selection = usersByClass[contributionStyle as keyof typeof usersByClass];

      if (!selection) {
        context.logger.verbose(`No ${String(contributionStyle)} found`);
        return [];
      }

      // Ensure selection is always an array
      const users = Array.isArray(selection) ? selection : [selection];

      users.forEach((user) => {
        if (!commentsOfRole) {
          return [];
        }
        perUserCommentScoring(
          context,
          user,
          commentsOfRole.filter((comment) => comment.user.id === user.id),
          scoring
        );
      });
      return scoring;
    });
}
