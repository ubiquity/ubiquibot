import { Logs } from "../../../../adapters/supabase";
import Runtime from "../../../../bindings/bot-runtime";
import { checkUserPermissionForRepoAndOrg, getAllIssueComments } from "../../../../helpers";
import { BotConfig, Context } from "../../../../types";
import { Comment, Issue, Payload, StateReason } from "../../../../types/payload";
import structuredMetadata from "../../../shared/structured-metadata";
import { generatePermits } from "./generate-permits";
import { aggregateAndScoreContributions } from "./scoreSources";
import { sumTotalScores } from "./sumTotalScoresPerContributor";

export const botCommandsAndHumanCommentsFilter = (comment: Comment) =>
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

  // === Calculate Permit === //

  // 1. score sources will credit every contributor for every one of their contributions
  const sourceScores = await aggregateAndScoreContributions({
    context,
    issue,
    issueComments,
    owner,
    repository,
    issueNumber,
  });
  // 2. sum total scores will sum the scores of every contribution, and organize them by contributor
  const contributorTotalScores = sumTotalScores(sourceScores);
  // 3. generate permits will generate a payment for every contributor
  const permitComment = await generatePermits(context, contributorTotalScores);
  // 4. return the permit comment
  return permitComment;
}

async function getEssentials(context: Context) {
  const payload = context.event.payload as Payload;
  const issue = payload.issue as Issue;
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  if (!issue) throw runtime.logger.error(context.event, "Issue is not defined");
  const issueComments = await getAllIssueComments(context, issue.number);
  const owner = payload?.organization?.login || payload.repository.owner.login;
  if (!owner) throw logger.error(context.event, "Owner is not defined");
  const repository = payload?.repository?.name;
  const issueNumber = issue.number;
  return { issue, runtime, logger, issueComments, owner, repository, issueNumber };
}
// console.trace({ totals: util.inspect({ totals }, { showHidden: true, depth: null }) });

interface PreflightChecksParams {
  issue: Issue;
  logger: Logs;
  issueComments: Comment[];
  config: BotConfig;
  payload: Payload;
  context: Context;
}
async function preflightChecks({ issue, logger, issueComments, config, payload, context }: PreflightChecksParams) {
  if (!issue) throw logger.error(context.event, "Permit generation skipped because issue is undefined");
  if (issue.state_reason !== StateReason.COMPLETED)
    throw logger.info(context.event, "Issue was not closed as completed. Skipping.", { issue });
  if (config.features.publicAccessControl.fundExternalClosedIssue) {
    const userHasPermission = await checkUserPermissionForRepoAndOrg(context, payload.sender.login);
    if (!userHasPermission)
      throw logger.warn(
        context.event,
        "Permit generation disabled because this issue has been closed by an external contributor."
      );
  }

  const priceLabels = issue.labels.find((label) => label.name.startsWith("Price: "));
  if (!priceLabels) {
    throw logger.warn(context.event, "No price label has been set. Skipping permit generation.", {
      labels: issue.labels,
    });
  }

  const botComments = issueComments.filter(botCommentsFilter);
  checkIfPermitsAlreadyPosted(context, botComments, logger);
}

function checkIfPermitsAlreadyPosted(context: Context, botComments: Comment[], logger: Logs) {
  botComments.forEach((comment) => {
    const parsed = structuredMetadata.parse(comment.body);
    if (parsed) {
      console.trace({ parsed });
      if (parsed.caller === "generatePermits") {
        // in the comment metadata we store what function rendered the comment
        console.trace({ parsed });
        throw logger.warn(context.event, "Permit already posted");
      }
    }
  });
}
