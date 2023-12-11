import Runtime from "../../../bindings/bot-runtime";
import { checkUserPermissionForRepoAndOrg, getAllIssueComments } from "../../../helpers/issue";
import { Context } from "../../../types/context";
import { GitHubComment, GitHubEvent, GitHubIssue, GitHubPayload, StateReason } from "../../../types/payload";
import structuredMetadata from "../../shared/structured-metadata";
import { delegateCompute } from "./delegated-compute";
// import { getCollaboratorsForRepo } from "./issue/get-collaborator-ids-for-repo";
// import { getPullRequestComments } from "./issue/get-pull-request-comments";

export async function issueClosed(context: Context) {
  const payload = context.event.payload as GitHubPayload;
  const issue = payload.issue as GitHubIssue;

  const { issueComments, issueOwner, issueRepository, issueNumber } = await getEssentials(context);
  await preflightChecks({ issue, issueComments, context });

  // === Calculate Permit === //

  // const pullRequestComments = await getPullRequestComments(context, owner, repository, issueNumber);

  // const repoCollaborators = await getCollaboratorsForRepo(context);

  const endpoint = await delegateCompute(context, {
    eventName: GitHubEvent.ISSUES_CLOSED,
    issueOwner,
    issueRepository,
    issueNumber,
  });

  return Runtime.getState().logger.ok("Evaluating results. Please wait...", {
    endpoint,
    view: transformEndpointToView(endpoint),
  });
}

async function getEssentials(context: Context) {
  const payload = context.event.payload as GitHubPayload;
  const issue = payload.issue as GitHubIssue;
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  if (!issue) throw context.logger.error("Issue is not defined");
  const issueComments = await getAllIssueComments(context, issue.number);
  const issueOwner = payload?.organization?.login || payload.repository.owner.login;
  if (!issueOwner) throw context.logger.error("Owner is not defined");
  const issueRepository = payload?.repository?.name;
  const issueNumber = issue.number;
  return { issue, runtime, logger, issueComments, issueOwner, issueRepository, issueNumber };
}

interface PreflightChecksParams {
  issue: GitHubIssue;
  issueComments: GitHubComment[];
  context: Context;
}

async function preflightChecks({ issue, issueComments, context }: PreflightChecksParams) {
  const { payload, config } = context;
  if (!issue) throw context.logger.error("Permit generation skipped because issue is undefined");
  if (issue.state_reason !== StateReason.COMPLETED)
    throw context.logger.info("Issue was not closed as completed. Skipping.", { issue });
  if (config.features.publicAccessControl.fundExternalClosedIssue) {
    const hasPermission = await checkUserPermissionForRepoAndOrg(context, payload.sender.login);
    if (!hasPermission)
      throw context.logger.error(
        "Permit generation disabled because this issue has been closed by an external contributor."
      );
  }

  const priceLabels = issue.labels.find((label) => label.name.startsWith("Price: "));
  if (!priceLabels) {
    throw context.logger.error("No price label has been set. Skipping permit generation.", {
      labels: issue.labels,
    });
  }

  const botComments = issueComments.filter((comment: GitHubComment) => comment.user.type === "Bot" /* No Humans */);
  checkIfPermitsAlreadyPosted(context, botComments);
}

function checkIfPermitsAlreadyPosted(context: Context, botComments: GitHubComment[]) {
  botComments.forEach((comment) => {
    const botComment = structuredMetadata.parse(comment.body);
    // if (botComment) {
    // console.trace({ parsed: botComment });
    if (botComment?.className === "Permits") {
      // in the comment metadata we store what function rendered the comment
      console.trace({ parsed: botComment });
      throw context.logger.error("Permit already posted");
    }
    // }
  });
}
function transformEndpointToView(endpoint: string): string {
  return endpoint.replace("api.", "").replace("/repos", "").replace("/dispatches", "");
}
