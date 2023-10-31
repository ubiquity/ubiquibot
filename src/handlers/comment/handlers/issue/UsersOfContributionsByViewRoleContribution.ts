import { User } from "../../../../types/payload";

// [VIEW] [ROLE] [CONTRIBUTION]
export type UsersOfContributionsByViewRoleContribution = {
  // start comments
  "Issue Issuer Comment": User;
  "Issue Assignee Comment": null | User;
  "Issue Collaborator Comment": User[];
  "Issue Default Comment": User[];

  "Review Issuer Comment": User;
  "Review Assignee Comment": User;
  "Review Collaborator Comment": User[];
  "Review Default Comment": User[];
  // end comments

  // start reviews
  "Review Issuer Approval": User;
  "Review Issuer Rejection": User;
  "Review Collaborator Approval": User[];
  "Review Collaborator Rejection": User[];
  // end reviews

  // start code
  "Review Issuer Code": User;
  "Review Assignee Code": User;
  "Review Collaborator Code": User[];
  // end code

  // start specification
  "Issue Issuer Specification": User;
  // end specification
};
