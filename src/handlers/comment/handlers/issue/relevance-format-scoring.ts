import Decimal from "decimal.js";
import { Issue } from "../../../../types/payload";
import { CommentScoring } from "./comment-scoring-rubric";
import { UserScoreDetails } from "./issue-shared-types";
import { EnrichedRelevance } from "./evaluate-comments";

// this can be used in two contexts:
// 1. to score an array of comments
// 2. to score an issue specification

export function relevanceAndFormatScoring(
  relevanceScore: EnrichedRelevance[],
  formatScore: CommentScoring[],
  issue: Issue
): UserScoreDetails[] {
  const details = [] as UserScoreDetails[];
  const scoresByUser = {} as { [userId: string]: Decimal };
  const scoresByUserDetails = {} as { [userId: string]: UserScoreDetails };
}

/*
export interface EnrichedRelevance {
  comment: Comment;
  user: User;
  score: Decimal;
}
*/

/*
  public contributionClass: ContributorClassNames;
  public userWordScoreTotals: { [userId: number]: Decimal } = {};
  public userFormatScoreTotals: { [userId: number]: Decimal } = {};
  public userFormatScoreDetails: {
    [userId: number]: {
      [commentId: number]: {
        count: number;
        score: Decimal;
        words: number;
      };
    };
  } = {};
  public commentScores: {
    [userId: number]: {
      [commentId: number]: {
        wordScoreTotal: Decimal;
        wordScoreDetails: { [word: string]: Decimal };
        formatScoreTotal: Decimal;
        formatScoreDetails: FormatScoreDetails;
      };
    };
  } = {};
*/
