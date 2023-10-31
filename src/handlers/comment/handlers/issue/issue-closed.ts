import Decimal from "decimal.js";
import { Logs } from "../../../../adapters/supabase";
import Runtime from "../../../../bindings/bot-runtime";
import { checkUserPermissionForRepoAndOrg, getAllIssueComments } from "../../../../helpers";
import { getLinkedPullRequests } from "../../../../helpers/parser";
import { BotConfig, Context } from "../../../../types";
import { Comment, Issue, Payload, StateReason, User } from "../../../../types/payload";
import structuredMetadata from "../../../shared/structured-metadata";
import { assigneeScoring as assigneeTaskScoring } from "./assignee-scoring";
import { evaluateComments, FinalScores } from "./evaluate-comments";
import { generatePermits } from "./generate-permits";
import { specificationScoring as issuerSpecificationScoring } from "./specification-scoring";

const botCommandsAndHumanCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

const botCommentsFilter = (comment: Comment) => comment.user.type === "Bot"; /* No Humans */

export async function issueClosed(context: Context) {
  // TODO: delegate permit calculation to GitHub Action

  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  const issue = payload.issue as Issue;
  const config = context.config;

  const { issueComments, owner, repository, issueNumber } = await getEssentials(context);

  await preflightChecks({ issue, logger, issueComments, config, payload, context });

  const issueAssigneeTask = await assigneeTaskScoring({
      issue,
      source: issue.assignees.filter((assignee): assignee is User => Boolean(assignee)),
    }),
    issueIssuerSpecification = await issuerSpecificationScoring({ context, issue }),
    issueContributorComments = await evaluateComments({
      context,
      issue,
      source: issueComments.filter(botCommandsAndHumanCommentsFilter),
    }),
    reviewContributorComments = await evaluateComments({
      context,
      issue,
      source: (
        await getPullRequestComments(context, owner, repository, issueNumber)
      ).filter(botCommandsAndHumanCommentsFilter),
    });
  // reviewApprovals
  // reviewRejections
  // reviewCode

  // { issueAssigneeTaskScore: issueAssigneeTask.score },
  // { issueIssuerSpecificationScore: issueIssuerSpecification.score },

  // const totals = Object.assign(
  //   {},
  //   { issueContributorCommentsScore: issueContributorComments.score },
  //   { reviewContributorCommentsScore: reviewContributorComments.score }
  // );

  const totals = calculateTotalScores(
    issueAssigneeTask,
    issueIssuerSpecification,
    issueContributorComments,
    reviewContributorComments
  );

  const permitComment = await generatePermits(
    context,
    totals,
    issueAssigneeTask,
    issueIssuerSpecification,
    issueContributorComments,
    reviewContributorComments
  );
  return permitComment;
}

async function getPullRequestComments(context: Context, owner: string, repository: string, issueNumber: number) {
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

async function getEssentials(context: Context) {
  const payload = context.event.payload as Payload;
  const issue = payload.issue as Issue;
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  if (!issue) throw runtime.logger.error("Issue is not defined");
  const issueComments = await getAllIssueComments(context, issue.number);
  const owner = payload?.organization?.login || payload.repository.owner.login;
  if (!owner) throw logger.error("Owner is not defined");
  const repository = payload?.repository?.name;
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

function calculateTotalScores(
  issueAssigneeTask: { source: Issue; score: { [userId: number]: Decimal } },
  issueIssuerSpecification: { source: Comment[]; score: FinalScores },
  issueContributorComments: { source: Comment[]; score: FinalScores },
  reviewContributorComments: { source: Comment[]; score: FinalScores }
): { [userId: number]: Decimal } {
  const totals: { [userId: number]: Decimal } = {};

  // 1. Change the type of `totals` to match the expected type in `generatePermits` function
  // or change the expected type in `generatePermits` function to match the type of `totals`

  // 2. Check the type of `scoreObject[userId]` before using it
  const addScores = (scoreObject: { [userId: number]: Decimal | { total: Decimal } }) => {
    for (const userId in scoreObject) {
      if (typeof scoreObject[userId] === "object" && "total" in scoreObject[userId]) {
        if (totals[userId]) {
          totals[userId] = totals[userId].plus((scoreObject[userId] as { total: Decimal }).total);
        } else {
          totals[userId] = (scoreObject[userId] as { total: Decimal }).total;
        }
      } else if (scoreObject[userId] instanceof Decimal) {
        if (totals[userId]) {
          totals[userId] = totals[userId].plus(scoreObject[userId]);
        } else {
          totals[userId] = scoreObject[userId];
        }
      }
    }
  };

  // Add scores from each object
  addScores(issueAssigneeTask.score);
  addScores(issueIssuerSpecification.score);
  addScores(issueContributorComments.score);
  addScores(reviewContributorComments.score);

  return totals;
}
