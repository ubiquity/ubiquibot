import Runtime from "../../../../bindings/bot-runtime";
import { Comment, Issue, User } from "../../../../types/payload";
// import { IssueRole } from "./archive/calculate-score-typings";
import { getCollaboratorsForRepo } from "./get-collaborator-ids-for-repo";
import { ScoringRubric } from "./scoring-rubric";

export type IssueRole = "Issue Issuer" | "Issue Assignee" | "Issue Collaborator" | "Issue Default";

type UsersOfCommentsByRole = {
  "Issue Issuer": User;
  "Issue Assignee": null | User;
  "Issue Collaborator": User[];
  "Issue Default": User[];
};
const scoringByRole = {
  // TODO: make this configurable
  "Issue Issuer": new ScoringRubric({ role: "Issue Issuer", multiplier: 1, wordValue: 0.2 }),
  "Issue Assignee": new ScoringRubric({ role: "Issue Assignee", multiplier: 0, wordValue: 0 }),
  "Issue Collaborator": new ScoringRubric({ role: "Issue Collaborator", multiplier: 0.5, wordValue: 0.1 }),
  "Issue Default": new ScoringRubric({ role: "Issue Default", multiplier: 0.25, wordValue: 0.1 }),
} as {
  [key in IssueRole]: ScoringRubric;
};

export async function _calculateAllCommentScores(issue: Issue, contributorComments: Comment[]) {
  const runtime = Runtime.getState();

  const usersOfCommentsByRole: UsersOfCommentsByRole = await _getUsersInRolesEnsureUnique(issue, contributorComments);
  const commentsByRole = _filterCommentsByRole(usersOfCommentsByRole, contributorComments);
  const roles = Object.keys(usersOfCommentsByRole) as IssueRole[]; // ["Issue Issuer", "Issue Assignee", "Issue Collaborator", "Issue Default"]

  const scoringRubrics = [] as ScoringRubric[];
  for (const role of roles) {
    const scoring = scoringByRole[role];
    const selection = usersOfCommentsByRole[role];
    if (!selection) {
      runtime.logger.verbose(`No ${role} found`);
      continue;
    }
    if (Array.isArray(selection)) {
      // collaborators or default users (array)
      for (const collaboratorOrDefaultUser of selection) {
        const commentsOfRole = commentsByRole[role];
        const scoringComplete = _calculatePerUserCommentScore(collaboratorOrDefaultUser, commentsOfRole, scoring);
        scoringRubrics.push(scoringComplete);
      }
    } else {
      // issuer or assignee (single user)
      const commentsOfRole = commentsByRole[role];
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
      const checks =
        comment.user.type === "User" &&
        !usersOfCommentsByRole["Issue Collaborator"].some((user: User) => user.id == comment.user.id) &&
        comment.user.id !== usersOfCommentsByRole["Issue Issuer"].id;

      if (checks && usersOfCommentsByRole["Issue Assignee"]) {
        return comment.user.id !== usersOfCommentsByRole["Issue Assignee"].id;
      } else {
        return checks;
      }
    }),
  };
}

// async function _getUsersInRoles(issue: Issue, contributorComments: Comment[]) {
//   // This finds every user from the comments and
//   // derives which role they fall under
//   // this can be redundant, as a user can be an issuer, assignee and a collaborator
//   const context = Runtime.getState().latestEventContext;

//   const issueIssuerUser = issue.user;
//   const issueAssigneeUser = issue.assignee;
//   const collaboratorUsers = await getCollaboratorsForRepo(context);

//   const roleIds = {
//     "Issue Issuer": issueIssuerUser,
//     "Issue Assignee": issueAssigneeUser,
//     "Issue Collaborator": collaboratorUsers,
//     "Issue Default": (function getRemainderUsers() {
//       const allRoleUsers = [issueIssuerUser, issueAssigneeUser, ...collaboratorUsers];
//       const humanUsersWhoCommented = contributorComments
//         .filter((comment) => comment.user.type === "User")
//         .map((comment) => comment.user);

//       const remainingUsers = humanUsersWhoCommented.filter(
//         (user: User) => !allRoleUsers.some((_user) => _user?.id === user.id)
//       );
//       return remainingUsers;
//     })(),
//   };
//   return roleIds;
// }

async function _getUsersInRolesEnsureUnique(issue: Issue, contributorComments: Comment[]) {
  const context = Runtime.getState().latestEventContext;

  const issueIssuerUser = issue.user;
  const issueAssigneeUser = issue.assignee;
  const collaboratorUsers = await getCollaboratorsForRepo(context);

  const allRoleUsers = [issueIssuerUser, issueAssigneeUser, ...collaboratorUsers];
  const humanUsersWhoCommented = contributorComments
    .filter((comment) => comment.user.type === "User")
    .map((comment) => comment.user);

  const roleIds = {
    "Issue Issuer": issueIssuerUser,
    "Issue Assignee": issueAssigneeUser && issueAssigneeUser.id !== issueIssuerUser.id ? issueAssigneeUser : null,
    "Issue Collaborator": collaboratorUsers.filter(
      (user: User) => user.id !== issueIssuerUser.id && (!issueAssigneeUser || user.id !== issueAssigneeUser.id)
    ),
    "Issue Default": humanUsersWhoCommented.filter(
      (user: User) => !allRoleUsers.some((_user) => _user?.id === user.id)
    ),
  };
  return roleIds;
}
