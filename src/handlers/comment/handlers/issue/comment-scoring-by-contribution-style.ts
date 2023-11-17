import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorClasses } from "./contribution-style-types";

export const commentScoringByContributionClass = {
  // TODO: make this configurable

  "Issue Assignee Task": () =>
    new CommentScoring({
      contributionClass: "Issue Assignee Task",
      formattingMultiplier: 0,
      wordValue: 0,
    }),

  "Issue Issuer Comment": () =>
    new CommentScoring({
      contributionClass: "Issue Issuer Comment",
      formattingMultiplier: 1,
      wordValue: 0.2,
    }),
  "Issue Assignee Comment": () =>
    new CommentScoring({
      contributionClass: "Issue Assignee Comment",
      formattingMultiplier: 0,
      wordValue: 0,
    }),

  "Issue Collaborator Comment": () =>
    new CommentScoring({
      contributionClass: "Issue Collaborator Comment",
      formattingMultiplier: 1,
      wordValue: 0.1,
    }),
  "Issue Contributor Comment": () =>
    new CommentScoring({
      contributionClass: "Issue Contributor Comment",
      formattingMultiplier: 0.25,
      wordValue: 0.1,
    }),
  "Review Issuer Comment": () =>
    new CommentScoring({
      contributionClass: "Review Issuer Comment",
      formattingMultiplier: 2,
      wordValue: 0.2,
    }),
  "Review Assignee Comment": () =>
    new CommentScoring({
      contributionClass: "Review Assignee Comment",
      formattingMultiplier: 1,
      wordValue: 0.1,
    }),
  "Review Collaborator Comment": () =>
    new CommentScoring({
      contributionClass: "Review Collaborator Comment",
      formattingMultiplier: 1,
      wordValue: 0.1,
    }),
  "Review Contributor Comment": () =>
    new CommentScoring({
      contributionClass: "Review Contributor Comment",
      formattingMultiplier: 0.25,
      wordValue: 0.1,
    }),
  // end comments
  // "Issue Issuer Specification": new CommentScoring({
  //   contributionClass: "Issue Issuer Specification",
  //   formattingMultiplier: 3,
  //   wordValue: 0.2,
  // }),

  // // // start reviews
  // "Review Issuer Approval": new CommentScoring({
  //   contributionClass: "Review Issuer Approval",
  //   formattingMultiplier: 1,
  //   wordValue: 2,
  // }),
  // "Review Issuer Rejection": new CommentScoring({
  //   contributionClass: "Review Issuer Rejection",
  //   formattingMultiplier: 1,
  //   wordValue: 2,
  // }),
  // "Review Collaborator Approval": new CommentScoring({
  //   contributionClass: "Review Collaborator Approval",
  //   formattingMultiplier: 1,
  //   wordValue: 1,
  // }),
  // "Review Collaborator Rejection": new CommentScoring({
  //   contributionClass: "Review Collaborator Rejection",
  //   formattingMultiplier: 1,
  //   wordValue: 1,
  // }),
  // // // end reviews
  // // // start code
  // "Review Issuer Code": new CommentScoring({
  //   contributionClass: "Review Issuer Code",
  //   formattingMultiplier: 1,
  //   wordValue: 1,
  // }),
  // "Review Assignee Code": new CommentScoring({
  //   contributionClass: "Review Assignee Code",
  //   formattingMultiplier: 0,
  //   wordValue: 0,
  // }),
  // "Review Collaborator Code": new CommentScoring({
  //   contributionClass: "Review Collaborator Code",
  //   formattingMultiplier: 1,
  //   wordValue: 1,
  // }),
} as {
  [key in keyof ContributorClasses]: () => CommentScoring;
};
