import { User } from "../../../../types/payload";

type IssueAssignee = User[] | User | null; // Sometimes issues have no assignee

// [VIEW] [ROLE] [CONTRIBUTION]
export type ContributorClasses = {
  // start comments
  "Issue Issuer Comment": User;
  "Issue Assignee Comment": IssueAssignee;
  "Issue Collaborator Comment": User[];
  "Issue Contributor Comment": User[];

  "Review Issuer Comment": User;
  "Review Assignee Comment": IssueAssignee;
  "Review Collaborator Comment": User[];
  "Review Contributor Comment": User[];
  // end comments

  // start reviews
  // "Review Issuer Approval": User;
  // "Review Issuer Rejection": User;
  // "Review Collaborator Approval": User[];
  // "Review Collaborator Rejection": User[];
  // end reviews

  // start code
  // "Review Issuer Code": User;
  // "Review Assignee Code": User;
  // "Review Collaborator Code": User[];
  // end code

  // start specification
  "Issue Issuer Specification": User;
  // end specification

  "Issue Assignee Task": IssueAssignee;
};
