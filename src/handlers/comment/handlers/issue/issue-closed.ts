import Decimal from "decimal.js";
import Runtime from "../../../../bindings/bot-runtime";
import { getAllIssueComments } from "../../../../helpers";
import { Comment, Issue, Payload } from "../../../../types/payload";
import { calculateQualScore } from "./calculate-quality-score";
import { calculateQuantScore } from "./calculate-quantity-score";
import { generatePermits } from "./generate-permits";
import { ScoringRubric } from "./scoring-rubric";
import { IssueRole } from "./_calculate-all-comment-scores";

const botCommandsAndCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

export async function issueClosed() {
  const { issue } = preamble();
  const issueComments = await getAllIssueComments(issue.number);
  const contributorComments = issueComments.filter(botCommandsAndCommentsFilter);
  const totals = await calculateScores(issue, contributorComments);

  // console.trace({ totals: util.inspect({ totals }, { showHidden: true, depth: null }) });

  // TODO: check if the permits were already posted before posting
  // TODO: delegate permit calculation to GitHub Action
  // TODO: calculate issue specification score.
  // TODO: calculate assignee score.
  // TODO: calculate pull request conversation score.
  // TODO: post the permits to the issue

  const comment = await generatePermits(totals, contributorComments);

  return comment;

  // return logger.ok("Issue closed. Check metadata for scoring details.", totals);
}

async function calculateScores(issue: Issue, contributorComments: Comment[]) {
  const qualityScore = await calculateQualScore(issue, contributorComments); // the issue specification is not included in this array scoring, it is only for the other contributor comments
  const qualityScoresWithMetaData = qualityScore.relevanceScores.map((score, index) => ({
    commentId: contributorComments[index].id,
    userId: contributorComments[index].user.id,
    score,
  }));
  const quantityScore = await calculateQuantScore(issue, contributorComments);

  const totals = applyQualityScoreToQuantityScore(qualityScoresWithMetaData, quantityScore);
  return totals;
}

function preamble() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  const issue = payload.issue as Issue;
  if (!issue) throw runtime.logger.error("Issue is not defined");
  return { issue, payload, context, runtime, logger };
}

export function applyQualityScoreToQuantityScore(
  qualityScoresWithCommentIds: { commentId: number; userId: number; score: number }[],
  quantityScore: ScoringRubric[]
) {
  const finalScores = {} as FinalScores;

  qualityScoresWithCommentIds.forEach(({ commentId, userId, score }) => {
    quantityScore.forEach((scoringRubric) => {
      const usersQuantityScores = scoringRubric.commentScores[userId];
      if (!usersQuantityScores) return;
      const userCommentScore = usersQuantityScores[commentId];
      if (!userCommentScore) throw new Error("userCommentScore is undefined");

      const quantityScore = userCommentScore.wordScoreTotal.plus(userCommentScore.elementScoreTotal);

      if (!finalScores[userId]) {
        finalScores[userId] = {
          role: scoringRubric.role,
          total: new Decimal(0),
          comments: [],
        };
      }

      const comment = {
        commentId: commentId,
        wordAndElementScoreTotal: quantityScore,
        qualityScore: score,
        finalScore: quantityScore.times(score),
        wordScoreTotal: userCommentScore.wordScoreTotal,
        elementScoreTotal: userCommentScore.elementScoreTotal,
        wordScoreDetails: userCommentScore.wordScoreDetails || null,
        elementScoreDetails: userCommentScore.elementScoreDetails || null,
      };

      finalScores[userId].total = finalScores[userId].total.plus(quantityScore.times(score));
      // finalScores[userId].total = finalScores[userId].total.plus(comment.finalScore);

      finalScores[userId].role = scoringRubric.role;
      finalScores[userId].comments.push(comment);
    });
  });

  return finalScores;
}
export interface FinalScores {
  [userId: number]: {
    role: IssueRole;
    total: Decimal;
    comments: CommentScoreDetails[];
  };
}
interface CommentScoreDetails {
  commentId: number;
  wordAndElementScoreTotal: Decimal;
  qualityScore: number;
  finalScore: Decimal;
  wordScoreTotal: Decimal;
  elementScoreTotal: Decimal;
  wordScoreDetails: { [word: string]: Decimal } | null;
  elementScoreDetails: { [element: string]: { count: number; score: Decimal; words: number } } | null;
}
