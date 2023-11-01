import Runtime from "../../../../bindings/bot-runtime";
import { Context } from "../../../../types";
import { Comment, Issue, User } from "../../../../types/payload";
import { getCollaboratorsForRepo } from "./get-collaborator-ids-for-repo";

export async function identifyUserIds(context: Context, issue: Issue, contributorComments: Comment[]) {
  const issueIssuerUser = issue.user;
  const issueAssigneeUser = issue.assignee;
  const collaboratorUsers = await getCollaboratorsForRepo(context);

  const allRoleUsers = [issueIssuerUser, issueAssigneeUser, ...collaboratorUsers];
  const humanUsersWhoCommented = contributorComments
    .filter((comment) => comment.user.type === "User")
    .map((comment) => comment.user);

  const roleIds = {
    // start comments
    "Issue Issuer Comment": issueIssuerUser,
    "Issue Assignee Comment":
      issueAssigneeUser && issueAssigneeUser.id !== issueIssuerUser.id ? issueAssigneeUser : null,
    "Issue Collaborator Comment": collaboratorUsers.filter(
      (user: User) => user.id !== issueIssuerUser.id && (!issueAssigneeUser || user.id !== issueAssigneeUser.id)
    ),
    "Issue Contributor Comment": humanUsersWhoCommented.filter(
      (user: User) => !allRoleUsers.some((_user) => _user?.id === user.id)
    ),

    "Review Issuer Comment": issueIssuerUser,
    "Review Assignee Comment":
      issueAssigneeUser && issueAssigneeUser.id !== issueIssuerUser.id ? issueAssigneeUser : null,
    "Review Collaborator Comment": collaboratorUsers.filter(
      (user: User) => user.id !== issueIssuerUser.id && (!issueAssigneeUser || user.id !== issueAssigneeUser.id)
    ),
    "Review Contributor Comment": humanUsersWhoCommented.filter(
      (user: User) => !allRoleUsers.some((_user) => _user?.id === user.id)
    ),
    // end comments
    // start reviews
    // "Review Issuer Approval": null,
    // "Review Issuer Rejection": null,
    // "Review Collaborator Approval": null,
    // "Review Collaborator Rejection": null,
    // end reviews
    // start code
    // "Review Issuer Code": null,
    // "Review Assignee Code": null,
    // "Review Collaborator Code": null,
    // end code
    // start specification
    "Issue Issuer Specification": issueIssuerUser,
    // end specification
  };
  return roleIds;
}
