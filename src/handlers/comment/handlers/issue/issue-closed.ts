import Decimal from "decimal.js";
import Runtime from "../../../../bindings/bot-runtime";
import { getAllIssueComments } from "../../../../helpers";
import { getLinkedPullRequests } from "../../../../helpers/parser";
import { Comment, Issue, Payload } from "../../../../types/payload";
import structuredMetadata from "../../../shared/structured-metadata";
import { calculateQualScore } from "./calculate-quality-score";
import { calculateQuantScore } from "./calculate-quantity-score";
import { generatePermits } from "./generate-permits";
import { ScoringRubric } from "./scoring-rubric";
import { IssueRole } from "./_calculate-all-comment-scores";

const botCommandsAndHumanCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

const botCommentsFilter = (comment: Comment) => comment.user.type === "Bot"; /* No Humans */

export async function issueClosed() {
  // TODO: delegate permit calculation to GitHub Action
  const { issue, logger, payload } = preamble();
  const issueComments = await getAllIssueComments(issue.number);
  const owner = payload?.organization?.login || payload.repository.owner.login;
  if (!owner) throw logger.error("Owner is not defined");
  const repository = payload?.repository?.name;
  const issueNumber = issue.number;

  // DONE: calculate pull request conversation score.
  const linkedPullRequests = await getLinkedPullRequests({ owner, repository, issue: issueNumber });
  if (linkedPullRequests.length) {
    const linkedCommentsPromises = linkedPullRequests.map((pull) => getAllIssueComments(pull.number));
    const linkedCommentsResolved = await Promise.all(linkedCommentsPromises);
    for (const linkedComments of linkedCommentsResolved) {
      issueComments.push(...linkedComments);
    }
  }

  const botComments = issueComments.filter(botCommentsFilter);
  const contributorComments = issueComments.filter(botCommandsAndHumanCommentsFilter);

  checkIfPermitsAlreadyPosted(botComments); // DONE: check if the permits were already posted before posting

  // TODO: calculate issue specification score.
  // TODO: calculate assignee score.

  const issueTotals = await calculateScores(issue, contributorComments);
  const comment = await generatePermits(issueTotals, contributorComments); // DONE: design metadata system for permit parsing
  return comment; // DONE: post the permits to the issue

  // console.trace({ totals: util.inspect({ totals }, { showHidden: true, depth: null }) });
}

function checkIfPermitsAlreadyPosted(botComments: Comment[]) {
  botComments.forEach((comment) => {
    const parsed = structuredMetadata.parse(comment.body);
    if (parsed) {
      // console.trace(parsed);
      if (parsed.caller === "generatePermits") {
        // console.trace(parsed.metadata);
        throw Runtime.getState().logger.warn("Permit already posted");
      }
    }
  });
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
  qualityScoresWithCommentIds: { commentId: number; userId: number; score: Decimal }[],
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
  qualityScore: Decimal;
  finalScore: Decimal;
  wordScoreTotal: Decimal;
  elementScoreTotal: Decimal;
  wordScoreDetails: { [word: string]: Decimal } | null;
  elementScoreDetails: { [element: string]: { count: number; score: Decimal; words: number } } | null;
}
