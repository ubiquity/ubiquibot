import Runtime from "../../../../bindings/bot-runtime";
import { getAllIssueComments } from "../../../../helpers";
import { Issue, Payload } from "../../../../types/payload";
import { calculateQualScore } from "./calculate-quality-score";
import { calculateQuantScore } from "./calculate-quantity-score";
import { Comment } from "../../../../types/payload";
import util from "util";
import Decimal from "decimal.js";
import { IssueRole } from "./archive/calculate-score-typings";

// TODO: make a filter to scrub out block quotes
const botCommandsAndCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

export async function issueClosed() {
  const { issue, logger } = preamble();
  const issueComments = await getAllIssueComments(issue.number);

  const contributorComments = issueComments.filter(botCommandsAndCommentsFilter);

  const qualityScore = await calculateQualScore(issue, contributorComments); // the issue specification is not included in this array scoring, it is only for the other contributor comments
  // const commentQualityMapping = qualityScore.relevanceScores.map((score, index) => ({
  //   comment: contributorComments[index],
  //   score,
  // }));
  const quantityScore = await calculateQuantScore(issue, contributorComments);

  // i need to get a list of all the comments, and map the comments to the scores
  // then i need to filter by user and then calculate each user reward and all the metadata for the reward

  // type FinalMapping = {
  //   [id: number]: {
  //     role: IssueRole;
  //     comments: Comment[];
  //     qualityScores: Decimal[];
  //     quantityScores: Decimal[];
  //     totalScores: Decimal[];
  //   };
  // };

  util.inspect.defaultOptions.depth = 10;
  util.inspect.defaultOptions.colors = true;
  util.inspect.defaultOptions.showHidden = true;
  util.inspect.defaultOptions.maxArrayLength = Infinity;
  util.inspect.defaultOptions.compact = false;
  util.inspect.defaultOptions.breakLength = Infinity;
  util.inspect.defaultOptions.maxStringLength = Infinity;
  const buffer = util.inspect(
    {
      // qualityScore,
      // commentQualityMapping,
      quantityScore,
    },
    false,
    null,
    true /* enable colors */
  );

  console.log(buffer);

  return logger.ok("Issue closed. Calculating quality score.", qualityScore);
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
