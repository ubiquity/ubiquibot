import { User } from "../../../../types/payload";

type All = User[] | User | null;

type Assignee = All;
type Issuer = User;
type Collaborator = All;
type Contributor = All;

// [VIEW] [ROLE] [CONTRIBUTION]

export type ContributorClasses = {
  // start comments
  "Issue Issuer Comment": Issuer;
  "Issue Assignee Comment": Assignee;
  "Issue Collaborator Comment": Collaborator;
  "Issue Contributor Comment": Contributor;
  // end comments

  // start specification
  "Issue Issuer Specification": Issuer;
  // end specification

  // start code
  "Issue Assignee Task": Assignee;
  // end code

  // start comments
  "Review Issuer Comment": Issuer;
  "Review Assignee Comment": Assignee;
  "Review Collaborator Comment": Collaborator;
  "Review Contributor Comment": Contributor;
  // end comments

  // start reviews
  "Review Issuer Approval": Issuer;
  "Review Issuer Rejection": Issuer;
  "Review Collaborator Approval": Collaborator;
  "Review Collaborator Rejection": Collaborator;
  // end reviews

  // start code
  "Review Issuer Code": Issuer;
  "Review Assignee Code": Assignee;
  "Review Collaborator Code": Collaborator;
  // end code
};
export type ContributorView = "Issue" | "Review";
export type ContributorRole = "Issuer" | "Assignee" | "Collaborator" | "Contributor";
export type ContributorContribution = "Comment" | "Approval" | "Rejection" | "Code" | "Specification" | "Task";
