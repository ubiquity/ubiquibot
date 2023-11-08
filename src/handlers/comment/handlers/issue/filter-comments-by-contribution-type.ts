import { Comment, User } from "../../../../types/payload";
import { ContributorClasses, ContributorView } from "./contribution-style-types";
type CommentsSortedByClass = {
  [className in keyof ContributorClasses]: null | Comment[];
};

export function sortCommentsByClass(
  usersByClass: ContributorClasses,
  contributorComments: Comment[],
  view: ContributorView
): CommentsSortedByClass {
  const result = {} as CommentsSortedByClass;

  for (const role of Object.keys(usersByClass)) {
    if (role.startsWith(view)) {
      const key = role as keyof ContributorClasses;
      if (key in usersByClass) {
        result[key] = filterComments(key, usersByClass, contributorComments);
      }
    }
  }

  return result;
}

function filterComments(
  role: keyof ContributorClasses,
  usersOfCommentsByRole: ContributorClasses,
  contributorComments: Comment[]
): Comment[] | null {
  const users = usersOfCommentsByRole[role];
  if (!users) return null;
  if (Array.isArray(users)) {
    return contributorComments.filter((comment: Comment) => users.some((user: User) => user.id == comment.user.id));
  } else {
    return contributorComments.filter((comment: Comment) => comment.user.id === users.id);
  }
}
