import Runtime from "../../../../bindings/bot-runtime";
import { Comment } from "../../../../types/payload";
import { commentScoringByContributionClass } from "./comment-scoring-by-contribution-style";
import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorClass } from "./contribution-style-types";
import { filterCommentsByContributionStyleType } from "./filter-comments-by-contribution-type";
import { identifyUserIds } from "./identify-user-ids";
import { perUserCommentScoring } from "./perUserCommentScoring";
import { ContextIssue, ContributorClassNames } from "./specification-scoring";

export async function allCommentScoring({
  context,
  issue,
  proof,
}: ContextIssue & { proof: Comment[] }): Promise<CommentScoring[]> {
  const runtime = Runtime.getState();

  const usersOfCommentsByRole: ContributorClass = await identifyUserIds(context, issue, proof);
  const commentsByRole = filterCommentsByContributionStyleType(usersOfCommentsByRole, proof);
  const contributionStyles = Object.keys(usersOfCommentsByRole) as ContributorClassNames[];

  const scoringRubrics = [] as CommentScoring[];

  for (const contributionStyle of contributionStyles) {
    const scoring = commentScoringByContributionClass[contributionStyle];
    const selection = usersOfCommentsByRole[contributionStyle];
    if (!selection) {
      runtime.logger.verbose(`No ${contributionStyle} found`);
      continue;
    }

    if (Array.isArray(selection)) {
      // collaborators or default users (array)
      for (const collaboratorOrDefaultUser of selection) {
        const commentsOfRole = commentsByRole[contributionStyle];
        if (!commentsOfRole) {
          continue;
        }
        const scoringComplete = perUserCommentScoring(collaboratorOrDefaultUser, commentsOfRole, scoring);
        scoringRubrics.push(scoringComplete);
      }
    } else {
      // issuer or assignee (single user)
      const commentsOfRole = commentsByRole[contributionStyle];
      if (!commentsOfRole) {
        continue;
      }
      const scoringComplete = perUserCommentScoring(selection, commentsOfRole, scoring);
      scoringRubrics.push(scoringComplete);
    }
  }
  return scoringRubrics;
}
