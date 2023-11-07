import { Comment, User } from "../../../../types/payload";
import { ContributorClass } from "./contribution-style-types";

export function filterCommentsByContributionStyleType(
  usersOfCommentsByRole: ContributorClass,
  contributorComments: Comment[]
): ContributionStyleTypesMap {
  function filterComments(role: keyof ContributorClass) {
    const users = usersOfCommentsByRole[role];
    if (!users) return null;
    if (Array.isArray(users)) {
      return contributorComments.filter((comment: Comment) => users.some((user: User) => user.id == comment.user.id));
    } else {
      return contributorComments.filter((comment: Comment) => comment.user.id === users.id);
    }
  }

  return {
    "Issue Issuer Comment": filterComments("Issue Issuer Comment"),
    "Issue Assignee Comment": filterComments("Issue Assignee Comment"),
    "Issue Collaborator Comment": filterComments("Issue Collaborator Comment"),
    "Issue Contributor Comment": filterComments("Issue Contributor Comment"),
    "Review Issuer Comment": filterComments("Review Issuer Comment"),
    "Review Assignee Comment": filterComments("Review Assignee Comment"),
    "Review Collaborator Comment": filterComments("Review Collaborator Comment"),
    "Review Contributor Comment": filterComments("Review Contributor Comment"),
    "Issue Issuer Specification": filterComments("Issue Issuer Specification"),
    "Issue Assignee Task": filterComments("Issue Assignee Task"),
  } as ContributionStyleTypesMap;
}
type ContributionStyleTypesMap = {
  [K in keyof ContributorClass]: null | Comment[];
};
