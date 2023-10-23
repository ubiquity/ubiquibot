import Runtime from "../../../../bindings/bot-runtime";
import { Comment, Issue, User } from "../../../../types/payload";
import { IssueRole } from "./archive/calculate-score-typings";
import { getCollaboratorsForRepo } from "./get-collaborator-ids-for-repo";
import { ScoringRubric } from "./scoring-rubric";
import Decimal from "decimal.js";

type UsersOfCommentsByRole = {
  "Issue Issuer": User;
  "Issue Assignee": null | User;
  "Issue Collaborator": User[];
  "Issue Default": User[];
};
const scoringByRole = {
  "Issue Issuer": new ScoringRubric(1, "Issue Issuer"),
  "Issue Assignee": new ScoringRubric(0, "Issue Assignee"),
  "Issue Collaborator": new ScoringRubric(0.5, "Issue Collaborator"),
  "Issue Default": new ScoringRubric(0.25, "Issue Default"),
} as {
  [key in IssueRole]: ScoringRubric;
};

export async function _calculateAllCommentScores(issue: Issue, contributorComments: Comment[]) {
  const usersOfCommentsByRole: UsersOfCommentsByRole = await _getUsersInRoles(issue, contributorComments);
  const commentsByRole = _filterCommentsByRole(usersOfCommentsByRole, contributorComments);
  const roles = Object.keys(usersOfCommentsByRole) as IssueRole[]; // ["Issue Issuer", "Issue Assignee", "Issue Collaborator", "Issue Default"]

  const scoringRubrics = [] as ScoringRubric[];
  for (const role of roles) {
    const scoring = scoringByRole[role];
    const selection = usersOfCommentsByRole[role];
    if (!selection) {
      console.trace("no assignee");
      continue;
    }
    if (Array.isArray(selection)) {
      // collaborators or default users (array)
      for (const collaboratorOrDefaultUser of selection) {
        const commentsOfRole = commentsByRole[role];
        const scoringComplete = _calculatePerUserCommentScore(role, collaboratorOrDefaultUser, commentsOfRole, scoring);
        scoringRubrics.push(scoringComplete);
      }
    } else {
      // issuer or assignee (single user)
      const commentsOfRole = commentsByRole[role];
      const scoringComplete = _calculatePerUserCommentScore(role, selection, commentsOfRole, scoring);
      scoringRubrics.push(scoringComplete);
    }
  }
  return scoringRubrics;
}

function _calculatePerUserCommentScore(role: IssueRole, user: User, comments: Comment[], scoringRubric: ScoringRubric) {
  scoringRubric.addUserId(user.id);

  for (const comment of comments) {
    scoringRubric.wordScore(comment.body);
    scoringRubric.elementScore(comment.body);
  }

  return scoringRubric;
}

function _filterCommentsByRole(usersOfCommentsByRole: UsersOfCommentsByRole, contributorComments: Comment[]) {
  return {
    "Issue Issuer": contributorComments.filter(
      (comment: Comment) => comment.user.id === usersOfCommentsByRole["Issue Issuer"].id
    ),
    "Issue Assignee": contributorComments.filter(
      (comment: Comment) => comment.user.id === usersOfCommentsByRole["Issue Assignee"]?.id || null
    ),
    "Issue Collaborator": contributorComments.filter((comment: Comment) =>
      usersOfCommentsByRole["Issue Collaborator"].filter((user: User) => user.id == comment.user.id)
    ),
    "Issue Default": contributorComments.filter((comment: Comment) => {
      // TODO: test this function
      // "does this filter out the remainder, and properly handle if assignee is null"
      const checks =
        comment.user.type === "User" &&
        !usersOfCommentsByRole["Issue Collaborator"].filter((user: User) => user.id == comment.user.id) &&
        comment.user.id !== usersOfCommentsByRole["Issue Issuer"].id;

      if (checks && usersOfCommentsByRole["Issue Assignee"]) {
        return comment.user.id !== usersOfCommentsByRole["Issue Assignee"].id;
      } else {
        return checks;
      }
    }),
  } as {
    [key in IssueRole]: Comment[];
  };
}

async function _getUsersInRoles(issue: Issue, contributorComments: Comment[]) {
  // This finds every user from the comments and
  // derives which role they fall under through a process of elimination.
  const context = Runtime.getState().latestEventContext;

  const issueIssuerUser = issue.user;
  const issueAssigneeUser = issue.assignee;
  const collaboratorUsers = await getCollaboratorsForRepo(context);

  const roleIds = {
    "Issue Issuer": issueIssuerUser,
    "Issue Assignee": issueAssigneeUser,
    "Issue Collaborator": collaboratorUsers,
    "Issue Default": (function getRemainderUsers() {
      const allRoleUsers = [issueIssuerUser, issueAssigneeUser, ...collaboratorUsers];
      const humanUsersWhoCommented = contributorComments
        .filter((comment) => comment.user.type === "User")
        .map((comment) => comment.user);

      const remainingUsers = humanUsersWhoCommented.filter(
        (user: User) => !allRoleUsers.filter((_user) => _user?.id === user.id)
      );
      return remainingUsers;
    })(),
  };
  return roleIds;
}
