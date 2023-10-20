import Runtime from "../../../../bindings/bot-runtime";
import { getAllIssueComments } from "../../../../helpers";
import { Issue, Payload } from "../../../../types/payload";
import { calculateQualScore } from "./calculate-quality-score";
import { calculateQuantScore } from "./calculate-quantity-score";
import { Comment } from "../../../../types/payload";

// TODO: make a filter to scrub out block quotes
const botCommandsAndCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

export async function issueClosed() {
  const { issue, logger } = preamble();
  const issueComments = await getAllIssueComments(issue.number);

  const contributorComments = issueComments.filter(botCommandsAndCommentsFilter);

  const qualityScore = await calculateQualScore(issue, contributorComments); // the issue specification is not included in this array scoring, it is only for the other contributor comments
  const quantityScore = calculateQuantScore(issue, contributorComments);

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
