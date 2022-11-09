import { Context } from "probot";
import { Payload } from "../interfaces/Payload";
import { pricingLabelLogic } from "./pricing-label-logic";

export async function callbackOnAny(context: Context) {
  const payload = context.payload as Payload;
  const ACTION = payload.action;
  console.log(ACTION);

  if (payload.sender.type == "Bot") return; // ignore bot invoked events
  if (context.name != "issues" && context.name != "issue_comment") return; // ignore non-issue related events

  switch (ACTION) {
    // comments

    case "deleted":
    case "edited":
    case "created":
      // // @ts-ignore-error
      // const body = payload.comment.body as string;
      // console.log(body);
      // if (body.includes("timeline")) {
      //   const timelineEvents = await listTimelineEventsForIssue(context);
      //   console.log(timelineEvents);
      // }
      // break;

    // issue general
    case "labeled":
    case "unlabeled":
      await pricingLabelLogic(payload, context);
      break;
    case "assigned":
    case "unassigned":
    case "opened":
    case "edited":
    case "closed":
    case "reopened":
    // case "milestoned":
    // case "demilestoned":
    // case "locked":
    // case "unlocked":
    // case "transferred":
    // case "pinned":
    // case "unpinned":

    default:
      break;
  }
}

async function listTimelineEventsForIssue(context: Context) {
  const payload = context.payload as Payload;
  const { owner, repo } = context.repo();
  const { data: timelineEvents } = await context.octokit.issues.listEventsForTimeline({
    owner,
    repo,
    issue_number: payload.issue.number,
    per_page: 10,
  });
  return timelineEvents;
}
