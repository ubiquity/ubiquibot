import { Context } from "../../../../types";
import { Comment, Issue, User } from "../../../../types/payload";
import { getCollaboratorsForRepo } from "./get-collaborator-ids-for-repo";

export async function identifyUserIds(context: Context, issue: Issue, contributorComments: Comment[]) {
  const issuer = issue.user;
  const assignees = issue.assignees;
  const collaborators = await getCollaboratorsForRepo(context);

  const allRoleUsers = [issuer, ...assignees, ...collaborators];
  const humanUsersWhoCommented = contributorComments
    .filter((comment) => comment.user.type === "User")
    .map((comment) => comment.user);

  const contributors = humanUsersWhoCommented.filter(
    (user: User) => !allRoleUsers.some((_user) => _user?.id === user.id)
  );

  const roleIds = {
    // start comments
    "Issue Issuer Comment": issuer,
    "Issue Assignee Comment": assignees,
    "Issue Collaborator Comment": collaborators,
    "Issue Contributor Comment": contributors,

    "Review Issuer Comment": issuer,
    "Review Assignee Comment": assignees,
    "Review Collaborator Comment": collaborators,
    "Review Contributor Comment": contributors,
    // end comments
    // start reviews
    "Review Issuer Approval": issuer, // TODO: not implemented
    "Review Issuer Rejection": issuer, // TODO: not implemented
    "Review Collaborator Approval": collaborators, // TODO: not implemented
    "Review Collaborator Rejection": collaborators, // TODO: not implemented
    // end reviews
    // start code
    "Review Issuer Code": issuer, // TODO: not implemented
    "Review Assignee Code": assignees, // TODO: not implemented
    "Review Collaborator Code": collaborators, // TODO: not implemented
    // end code
    // start specification
    "Issue Issuer Specification": issuer,
    // end specification
    "Issue Assignee Task": assignees,
  };
  return roleIds;
}
