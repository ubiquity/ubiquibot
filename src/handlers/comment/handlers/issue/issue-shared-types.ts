import Decimal from "decimal.js";
import { Issue, User } from "../../../../types/payload";
import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorContribution, ContributorRole, ContributorView } from "./contribution-style-types";

export interface UserScoreTotals {
  // class: ContributorClassNames;

  // view: ContributorView;
  // role: ContributorRole;
  // contribution: ContributorContribution;

  total: Decimal;
  details: UserScoreDetails[];
  user: User;
}

export interface UserScoreDetails {
  score: Decimal;

  view: null | ContributorView;
  role: null | ContributorRole;
  contribution: null | ContributorContribution;

  scoring: {
    issueComments: null | CommentScoring;
    reviewComments: null | CommentScoring;
    specification: null | CommentScoring;
    task: null | Decimal;
    // approvals: unknown;
    // rejections: unknown;
    // code: unknown;
  };
  source: {
    // comments: null | Comment[];
    issue: Issue;
    user: User;
  };
}
