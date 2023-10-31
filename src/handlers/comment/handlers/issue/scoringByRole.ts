import { ScoringRubric } from "./scoring-rubric";
import { ContributionStyles } from "./_calculate-all-comment-scores";

export const scoringByRole = {
  // TODO: make this configurable
  // "Issue Issuer":
  // "Issue Assignee":
  // "Issue Collaborator":
  // "Issue Default":
  // "Review Issuer":
  // "Review Assignee":
  // "Review Collaborator":
  // "Review Default":
  "Issue Issuer Comment": new ScoringRubric({
    role: "Issue Issuer Comment",
    formattingMultiplier: 1,
    wordValue: 0.2,
  }),
  "Issue Assignee Comment": new ScoringRubric({
    role: "Issue Assignee Comment",
    formattingMultiplier: 0,
    wordValue: 0,
  }),
  "Issue Collaborator Comment": new ScoringRubric({
    role: "Issue Collaborator Comment",
    formattingMultiplier: 1,
    wordValue: 0.1,
  }),
  "Issue Default Comment": new ScoringRubric({
    role: "Issue Default Comment",
    formattingMultiplier: 0.25,
    wordValue: 0.1,
  }),
  "Review Issuer Comment": new ScoringRubric({
    role: "Review Issuer Comment",
    formattingMultiplier: 2,
    wordValue: 0.2,
  }),
  "Review Assignee Comment": new ScoringRubric({
    role: "Review Assignee Comment",
    formattingMultiplier: 1,
    wordValue: 0.1,
  }),
  "Review Collaborator Comment": new ScoringRubric({
    role: "Review Collaborator Comment",
    formattingMultiplier: 1,
    wordValue: 0.1,
  }),
  "Review Default Comment": new ScoringRubric({
    role: "Review Default Comment",
    formattingMultiplier: 0.25,
    wordValue: 0.1,
  }),
  // end comments
  "Issue Issuer Specification": new ScoringRubric({
    role: "Issue Issuer Specification",
    formattingMultiplier: 3,
    wordValue: 0.2,
  }),

  // start reviews
  "Review Issuer Approval": new ScoringRubric({
    role: "Review Issuer Approval",
    formattingMultiplier: 1,
    wordValue: 2,
  }),
  "Review Issuer Rejection": new ScoringRubric({
    role: "Review Issuer Rejection",
    formattingMultiplier: 1,
    wordValue: 2,
  }),
  "Review Collaborator Approval": new ScoringRubric({
    role: "Review Collaborator Approval",
    formattingMultiplier: 1,
    wordValue: 1,
  }),
  "Review Collaborator Rejection": new ScoringRubric({
    role: "Review Collaborator Rejection",
    formattingMultiplier: 1,
    wordValue: 1,
  }),
  // end reviews
  // start code
  "Review Issuer Code": new ScoringRubric({ role: "Review Issuer Code", formattingMultiplier: 1, wordValue: 1 }),
  "Review Assignee Code": new ScoringRubric({ role: "Review Assignee Code", formattingMultiplier: 0, wordValue: 0 }),
  "Review Collaborator Code": new ScoringRubric({
    role: "Review Collaborator Code",
    formattingMultiplier: 1,
    wordValue: 1,
  }),
} as {
  [key in ContributionStyles]: ScoringRubric;
};
