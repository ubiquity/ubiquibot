import Runtime from "../../../../bindings/bot-runtime";
import { Context } from "../../../../types";
import { Comment, Issue, User } from "../../../../types/payload";
// import { IssueRole } from "./archive/calculate-score-typings";
import { ScoringRubric } from "./scoring-rubric";
import { scoringByRole as scoringByContributionStyle } from "./scoringByRole";
import { UsersOfContributionsByViewRoleContribution as UsersOfContributionsByContributionStyle } from "./UsersOfContributionsByViewRoleContribution";
import { _filterCommentsByRole } from "./_filterCommentsByRole";
import { _getUsersInRolesEnsureUnique } from "./_getUsersInRolesEnsureUnique";

export type ContributionStyles = keyof UsersOfContributionsByContributionStyle;

export async function _calculateIssueSpecificationScore(issue: Issue, specification: string) {
  const scoringRubric = scoringByContributionStyle["Issue Issuer Specification"];
  scoringRubric.computeWordScore({ body: specification, id: issue.id }, issue.user.id);
  // scoringRubric.compileUserScores();
  return scoringRubric;
}

export async function _calculateAllCommentScores(context: Context, issue: Issue, contributorComments: Comment[]) {
  const runtime = Runtime.getState();

  const usersOfCommentsByRole: UsersOfContributionsByContributionStyle = await _getUsersInRolesEnsureUnique(
    issue,
    contributorComments
  );
  const commentsByRole = _filterCommentsByRole(usersOfCommentsByRole, contributorComments);
  const contributionStyles = Object.keys(usersOfCommentsByRole) as ContributionStyles[];

  const scoringRubrics = [] as ScoringRubric[];

  for (const contributionStyle of contributionStyles) {
    const scoring = scoringByContributionStyle[contributionStyle];
    const selection = usersOfCommentsByRole[contributionStyle];
    if (!selection) {
      runtime.logger.verbose(`No ${contributionStyle} found`);
      continue;
    }

    if (Array.isArray(selection)) {
      // collaborators or default users (array)
      for (const collaboratorOrDefaultUser of selection) {
        const commentsOfRole = commentsByRole[contributionStyle];
        const scoringComplete = _calculatePerUserCommentScore(collaboratorOrDefaultUser, commentsOfRole, scoring);
        scoringRubrics.push(scoringComplete);
      }
    } else {
      // issuer or assignee (single user)
      const commentsOfRole = commentsByRole[contributionStyle];
      const scoringComplete = _calculatePerUserCommentScore(selection, commentsOfRole, scoring);
      scoringRubrics.push(scoringComplete);
    }
  }

  return scoringRubrics;
}

function _calculatePerUserCommentScore(user: User, comments: Comment[], scoringRubric: ScoringRubric) {
  for (const comment of comments) {
    scoringRubric.computeWordScore(comment, user.id);
    scoringRubric.computeElementScore(comment, user.id);
  }
  scoringRubric.compileUserScores();
  return scoringRubric;
}
