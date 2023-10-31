import Decimal from "decimal.js";
import { Comment, Issue } from "../../../../types/payload";
import { relevanceAndFormatScoring } from "./relevance-format-scoring";
import { relevanceScoring } from "./relevance-scoring";
import { formatScoring } from "./format-scoring";
import { ContributionStyles } from "./specification-scoring";
import { Context } from "../../../../types/context";
type ContextIssue = { context: Context; issue: Issue };
export async function evaluateComments({
  context,
  issue,
  proof,
}: ContextIssue & { proof: Comment[] }): Promise<FinalScores> {
  const relevance = await relevanceScoring(issue, proof); // the issue specification is not included in this array scoring, it is only for the other contributor comments
  const relevanceWithMetaData = relevance.score.map(enrichRelevanceData(proof));
  const formatting = await formatScoring(context, issue, proof);
  const totals = relevanceAndFormatScoring(relevanceWithMetaData, formatting);
  return totals;
}

export function enrichRelevanceData(
  contributorComments: Comment[]
): (value: Decimal, index: number, array: Decimal[]) => { commentId: number; userId: number; score: Decimal } {
  return (score, index) => ({
    commentId: contributorComments[index].id,
    userId: contributorComments[index].user.id,
    score,
  });
}

export interface FinalScores {
  [userId: number]: {
    role: ContributionStyles;
    total: Decimal;
    comments: CommentScoreDetails[];
    specification: CommentScoreDetails | null;
    // approval: unknown; // CommentScoreDetails | null;
    // rejection: unknown; // CommentScoreDetails | null;
    // code: unknown; // CommentScoreDetails | null;
  };
}
interface CommentScoreDetails {
  commentId: number;
  wordAndElementScoreTotal: Decimal;
  qualityScore: Decimal;

  finalScore: Decimal;

  wordScoreTotal: Decimal;
  elementScoreTotal: Decimal;

  wordScoreDetails: { [word: string]: Decimal } | null;
  elementScoreDetails: { [element: string]: { count: number; score: Decimal; words: number } } | null;
}
