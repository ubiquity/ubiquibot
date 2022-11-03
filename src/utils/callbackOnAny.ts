import { Context } from "probot";
import { Payload } from "../interfaces/Payload";
import { pricingLabelLogic } from "./pricing-label-logic";

export async function callbackOnAny(context: Context) {
  const payload = context.payload as Payload;
  if (payload.sender.type == "Bot") return;
  if (context.name != "issues") return;
  // if (payload.issue.number != 9) return;
  if (payload.action == "labeled" || payload.action == "unlabeled") {
    await pricingLabelLogic(payload, context);
    return;
  }
  const timelineEvents = await listTimelineEventsForIssue(context);
  console.log(timelineEvents);
  // console.log(payload.action);
}

async function listTimelineEventsForIssue(context: Context) {
  const payload = context.payload as Payload;
  const { owner, repo } = context.repo();
  const { data: timelineEvents } = await context.octokit.issues.listEventsForTimeline({
    owner,
    repo,
    issue_number: payload.issue.number,
    per_page: 100,
  });
  return timelineEvents;
}
