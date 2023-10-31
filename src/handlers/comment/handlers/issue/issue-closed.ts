import { Context } from "probot";
import { Logs } from "../../../../adapters/supabase";
import Runtime from "../../../../bindings/bot-runtime";
import { checkUserPermissionForRepoAndOrg, getAllIssueComments } from "../../../../helpers";
import { getLinkedPullRequests } from "../../../../helpers/parser";
import { BotConfig } from "../../../../types";
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
  const { issue, issueComments, owner, repository, issueNumber, logger, config, payload, context } =
    await getEssentials();
  await preflightChecks({ issue, logger, issueComments, config, payload, context });

  const pullRequestComments = await getPullRequestComments(owner, repository, issueNumber);
  const allComments = [...issueComments, ...pullRequestComments];

  const humanComments = allComments.filter(botCommandsAndHumanCommentsFilter);

  // TODO: calculate issue specification score. should save on the same scoring rubric as the comments.
  // const specificationScore =
  await _calculateIssueSpecificationScore(issue, issue.body);
  // TODO: calculate assignee score.
  const nonNullAssignees = issue.assignees.filter((assignee): assignee is User => Boolean(assignee));
  const assigneeScores = await calculateAssigneeScores(issue, nonNullAssignees);
  // await calculateAssigneeScore(issue, issue.assignees);

  const commentScores = await calculateQualityAndQuantityScores(issue, humanComments);
  const permitComment = await generatePermits(commentScores, humanComments); // DONE: design metadata system for permit parsing
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

async function getEssentials() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  const issue = payload.issue as Issue;
  const config = runtime.botConfig;
  if (!issue) throw runtime.logger.error("Issue is not defined");
  const issueComments = await getAllIssueComments(issue.number);
  const owner = payload?.organization?.login || payload.repository.owner.login;
  if (!owner) throw logger.error("Owner is not defined");
  const repository = payload?.repository?.name;
  const issueNumber = issue.number;
  return { issue, payload, context, runtime, logger, config, issueComments, owner, repository, issueNumber };
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
async function preflightChecks({
  issue,
  logger,
  issueComments,
  config = Runtime.getState().botConfig,
  payload,
  context,
}: PreflightChecks) {
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
