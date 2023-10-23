import Runtime from "../../../../bindings/bot-runtime";
import { getAllIssueComments } from "../../../../helpers";
import { Issue, Payload } from "../../../../types/payload";
import { calculateQualScore } from "./calculate-quality-score";
import { calculateQuantScore } from "./calculate-quantity-score";
import { Comment } from "../../../../types/payload";
import util from "util";
import Decimal from "decimal.js";
import { IssueRole } from "./archive/calculate-score-typings";
import { ScoringRubric } from "./scoring-rubric";

// TODO: make a filter to scrub out block quotes
const botCommandsAndCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

export async function issueClosed() {
  const { issue, logger } = preamble();
  const issueComments = await getAllIssueComments(issue.number);

  const contributorComments = issueComments.filter(botCommandsAndCommentsFilter);

  const qualityScore = await calculateQualScore(issue, contributorComments); // the issue specification is not included in this array scoring, it is only for the other contributor comments
  const qualityScoresWithMetaData = qualityScore.relevanceScores.map((score, index) => ({
    commentId: contributorComments[index].id,
    userId: contributorComments[index].user.id,
    score,
  }));
  const quantityScore = await calculateQuantScore(issue, contributorComments);

  const totals = applyQualityScoreToQuantityScore(qualityScoresWithMetaData, quantityScore);

  // util.inspect.defaultOptions.depth = 10;
  // util.inspect.defaultOptions.colors = true;
  // util.inspect.defaultOptions.showHidden = true;
  // util.inspect.defaultOptions.maxArrayLength = Infinity;
  // util.inspect.defaultOptions.compact = false;
  // util.inspect.defaultOptions.breakLength = Infinity;
  // util.inspect.defaultOptions.maxStringLength = Infinity;
  // const buffer = util.inspect(
  //   {
  //     // qualityScore,
  //     // commentQualityMapping,
  //     // quantityScore,
  //     totals,
  //   },
  //   false,
  //   null,
  //   true /* enable colors */
  // );

  // console.log(buffer);

  return logger.ok("Issue closed. Check metadata for scoring details.", totals);
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

function applyQualityScoreToQuantityScore(
  qualityScoresWithCommentIds: { commentId: number; userId: number; score: number }[],
  quantityScore: ScoringRubric[]
) {
  const finalScores = {} as {
    [userId: number]: {
      total: Decimal;
      details: {
        commentId: number;
        wordAndElementScoreTotal: Decimal;
        qualityScore: number;
        finalScore: Decimal;
      }[];
    };
  };

  qualityScoresWithCommentIds.forEach(({ commentId, userId, score }) => {
    quantityScore.forEach((scoringRubric) => {
      const usersQuantityScores = scoringRubric.commentScores[userId];

      if (usersQuantityScores) {
        const userCommentScore = usersQuantityScores[commentId];
        const quantityScore = userCommentScore.wordScoreTotal.plus(userCommentScore.elementScoreTotal);

        const newScore = {
          commentId: commentId,
          finalScore: quantityScore.times(score),
          qualityScore: score,
          wordAndElementScoreTotal: quantityScore,
          details: userCommentScore,
        };

        if (!finalScores[userId]) {
          finalScores[userId] = {
            total: new Decimal(0),
            details: [],
          };
        }

        finalScores[userId].details.push(newScore);
        finalScores[userId].total = finalScores[userId].total.plus(newScore.finalScore);
      }
    });
  });

  return finalScores;
}
