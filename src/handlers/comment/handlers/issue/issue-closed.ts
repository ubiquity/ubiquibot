import Runtime from "../../../../bindings/bot-runtime";
import { getAllIssueComments } from "../../../../helpers";
import { Issue, Payload } from "../../../../types/payload";
import { calculateQualScore } from "./calculate-quality-score";

export async function issueClosed() {
  const { issue, logger } = preamble();
  const issueComments = await getAllIssueComments(issue.number);
  return logger.ok("Issue closed. Calculating quality score.", calculateQualScore(issue, issueComments));
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
