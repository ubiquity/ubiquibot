import Decimal from "decimal.js";
import { Comment, Issue } from "../../../../types/payload";
import { ContributorClassNames } from "./specification-scoring";
import { CommentScoring } from "./comment-scoring-rubric";
export interface ScoresByUser {
  [userId: string]: ScoreOfUser;
}
export interface ScoreOfUser {
  total: Decimal;
  userId: number;
  username: string;
  class: ContributorClassNames;
  details: ScoreDetails[];
}
export interface ScoreDetails {
  score: Decimal;
  scoring: {
    comments: CommentScoreDetails[] | null;
    specification: CommentScoreDetails | null;
    task: TaskScoreDetails | null;
  };
  source: {
    comments: null | Comment[];
    issue: Issue;
  };
}

export type CommentDetailsType = (typeof CommentScoring.prototype.userFormatScoreDetails)[number][string];
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
  finalScore: Decimal;
  multiplier: Decimal;
}
