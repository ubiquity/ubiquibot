import Decimal from "decimal.js";
import { Comment, Issue, User } from "../../../../types/payload";
import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorContribution, ContributorRole, ContributorView } from "./contribution-style-types";
import { ContributorClassNames } from "./specification-scoring";

export interface UserScoreTotals {
  class: ContributorClassNames;
  total: Decimal;
  details: UserScoreDetails[];
  user: User;
}
export interface UserScoreDetails {
  score: Decimal;

  view: ContributorView;
  role: ContributorRole;
  contribution: ContributorContribution;

  scoring: {
    comments: CommentScoreDetails[] | null;
    specification: CommentScoreDetails | null;
    task: TaskScoreDetails | null;
  };
  source: {
    comments: null | Comment[];
    issue: Issue;
    user: User;
  };
}

export type CommentDetailsType = (typeof CommentScoring.prototype.userFormatScoreDetails)[number][number];
export interface CommentScoreDetails {
  commentId: number;
  // wordAndFormattingScore: Decimal;
  relevanceScore: Decimal;

  finalScore: Decimal;

  wordScore: Decimal;
  formattingScore: Decimal;

  wordScoreDetails: { [word: string]: Decimal } | null;
  formattingScoreDetails: CommentDetailsType;
}
interface TaskScoreDetails {
  priceLabel: Decimal;
  multiplier: Decimal;
}
