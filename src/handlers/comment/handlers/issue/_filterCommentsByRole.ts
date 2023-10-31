import { Comment, User } from "../../../../types/payload";
import { UsersOfContributionsByViewRoleContribution } from "./UsersOfContributionsByViewRoleContribution";

export function _filterCommentsByRole(
  usersOfCommentsByRole: UsersOfContributionsByViewRoleContribution,
  contributorComments: Comment[]
) {
  return {
    "Issue Issuer Comment": contributorComments.filter(
      (comment: Comment) => comment.user.id === usersOfCommentsByRole["Issue Issuer Comment"].id
    ),
    "Issue Assignee Comment": contributorComments.filter(
      (comment: Comment) => comment.user.id === usersOfCommentsByRole["Issue Assignee Comment"]?.id || null
    ),
    "Issue Collaborator Comment": contributorComments.filter((comment: Comment) =>
      usersOfCommentsByRole["Issue Collaborator Comment"].filter((user: User) => user.id == comment.user.id)
    ),
    "Issue Default Comment": contributorComments.filter((comment: Comment) => {
      const checks =
        comment.user.type === "User" &&
        !usersOfCommentsByRole["Issue Collaborator Comment"].some((user: User) => user.id == comment.user.id) &&
        comment.user.id !== usersOfCommentsByRole["Issue Issuer Comment"].id;

      if (checks && usersOfCommentsByRole["Issue Assignee Comment"]) {
        return comment.user.id !== usersOfCommentsByRole["Issue Assignee Comment"].id;
      } else {
        return checks;
      }
    }),
    "Review Issuer Comment": null,
    "Review Assignee Comment": null,
    "Review Collaborator Comment": null,
    "Review Default Comment": null,

    // start reviews
    "Review Issuer Approval": null,
    "Review Issuer Rejection": null,
    "Review Collaborator Approval": null,
    "Review Collaborator Rejection": null,
    // end reviews
    // start code
    "Review Issuer Code": null,
    "Review Assignee Code": null,
    "Review Collaborator Code": null,
    // end code
    // start specification
    "Issue Issuer Specification": null,
    // end specification
  };
}
