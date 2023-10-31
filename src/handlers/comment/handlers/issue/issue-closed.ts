import { Logs } from "../../../../adapters/supabase";
import Runtime from "../../../../bindings/bot-runtime";
import { checkUserPermissionForRepoAndOrg, getAllIssueComments } from "../../../../helpers";
import { getLinkedPullRequests } from "../../../../helpers/parser";
import { BotConfig, Context } from "../../../../types";
import { Comment, Issue, Payload, StateReason, User } from "../../../../types/payload";
import structuredMetadata from "../../../shared/structured-metadata";
import { calculateAssigneeScores } from "./calculateAssigneeScores";
import { calculateQualityAndQuantityScores } from "./calculateQualityAndQuantityScores";
import { generatePermits } from "./generate-permits";
import { _calculateIssueSpecificationScore } from "./_calculate-all-comment-scores";

const botCommandsAndHumanCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

const botCommentsFilter = (comment: Comment) => comment.user.type === "Bot"; /* No Humans */

export async function issueClosed(context: Context) {
  // TODO: delegate permit calculation to GitHub Action

  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  const issue = payload.issue as Issue;
  const config = context.config;

  const { issueComments, owner, repository, issueNumber } = await getEssentials(context);

  await preflightChecks({ issue, logger, issueComments, config, payload, context });

  const pullRequestComments = await getPullRequestComments(owner, repository, issueNumber);
  const humanComments = {
    issue: issueComments.filter(botCommandsAndHumanCommentsFilter),
    review: pullRequestComments.filter(botCommandsAndHumanCommentsFilter),
  }; // [...issueComments, ...pullRequestComments];

  // const humanComments = allComments.filter(botCommandsAndHumanCommentsFilter);

  // DONE: calculate issue specification score. should save on the same scoring rubric as the comments.
  await _calculateIssueSpecificationScore(issue, issue.body);
  // DONE: calculate assignee score.
  const nonNullAssignees = issue.assignees.filter((assignee): assignee is User => Boolean(assignee));
  const assigneeScores = await calculateAssigneeScores(issue, nonNullAssignees);
  // await calculateAssigneeScore(issue, issue.assignees);

  const issueCommentScores = await calculateQualityAndQuantityScores(context, issue, humanComments.issue);
  const reviewCommentScores = await calculateQualityAndQuantityScores(context, issue, humanComments.review);

  const permitComment = await generatePermits(context, issueCommentScores, humanComments); // DONE: design metadata system for permit parsing
  return permitComment; // DONE: post the permits to the issue
}

async function getPullRequestComments(owner: string, repository: string, issueNumber: number) {
  const pullRequestComments: Comment[] = [];
  const linkedPullRequests = await getLinkedPullRequests({ owner, repository, issue: issueNumber });
  if (linkedPullRequests.length) {
    const linkedCommentsPromises = linkedPullRequests.map((pull) => getAllIssueComments(context, pull.number));
    const linkedCommentsResolved = await Promise.all(linkedCommentsPromises);
    for (const linkedComments of linkedCommentsResolved) {
      pullRequestComments.push(...linkedComments);
    }
  }
  return pullRequestComments;
}

async function getEssentials(context) {
  const issue = context.payload.issue as Issue;
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  if (!issue) throw runtime.logger.error("Issue is not defined");
  const issueComments = await getAllIssueComments(context, issue.number);
  const owner = context.payload?.organization?.login || context.payload.repository.owner.login;
  if (!owner) throw logger.error("Owner is not defined");
  const repository = context.payload?.repository?.name;
  const issueNumber = issue.number;
  return { issue, runtime, logger, issueComments, owner, repository, issueNumber };
}
// console.trace({ totals: util.inspect({ totals }, { showHidden: true, depth: null }) });

interface PreflightChecks {
  issue: Issue;
  logger: Logs;
  issueComments: Comment[];
  config: BotConfig;
  payload: Payload;
  context: Context;
}
async function preflightChecks({ issue, logger, issueComments, config, payload, context }: PreflightChecks) {
  if (!issue) throw logger.error("Permit generation skipped because issue is undefined");
  if (issue.state_reason !== StateReason.COMPLETED)
    throw logger.info("Issue was not closed as completed. Skipping.", { issue });
  if (config.publicAccessControl.fundExternalClosedIssue) {
    const userHasPermission = await checkUserPermissionForRepoAndOrg(context, payload.sender.login);
    if (!userHasPermission)
      throw logger.warn("Permit generation disabled because this issue has been closed by an external contributor.");
  }

  // DONE: make sure a price is set before generating permits.
  const priceLabels = issue.labels.find((label) => label.name.startsWith("Price: "));
  if (!priceLabels)
    throw logger.warn("No price label has been set. Skipping permit generation.", { labels: issue.labels });

  const botComments = issueComments.filter(botCommentsFilter);
  checkIfPermitsAlreadyPosted(botComments, logger); // DONE: check if the permits were already posted before posting them again
}

function checkIfPermitsAlreadyPosted(botComments: Comment[], logger: Logs) {
  botComments.forEach((comment) => {
    const parsed = structuredMetadata.parse(comment.body);
    if (parsed) {
      console.trace({ parsed });
      if (parsed.caller === "generatePermits") {
        // in the metadata we store what function rendered the comment
        console.trace({ parsed });
        throw logger.warn("Permit already posted");
      }
    }
  });
}
