import Runtime from "../../../../bindings/bot-runtime";
import { env } from "../../../../bindings/env";
import { checkUserPermissionForRepoAndOrg, getAllIssueComments } from "../../../../helpers/issue";
import { Context } from "../../../../types/context";
import { Comment, Issue, Payload, StateReason } from "../../../../types/payload";
import structuredMetadata from "../../../shared/structured-metadata";
import { getCollaboratorsForRepo } from "./get-collaborator-ids-for-repo";
import { getPullRequestComments } from "./get-pull-request-comments";

export async function issueClosed(context: Context) {
  // TODO: delegate permit calculation to GitHub Action

  const payload = context.event.payload as Payload;
  const issue = payload.issue as Issue;

  const { issueComments, owner, repository, issueNumber } = await getEssentials(context);
  await preflightChecks({ issue, issueComments, context });

  // === Calculate Permit === //

  const pullRequestComments = await getPullRequestComments(context, owner, repository, issueNumber);
  const repoCollaborators = await getCollaboratorsForRepo(context);

  await dispatchWorkflow(owner, "ubiquibot-config", "compute.yml", {
    eventName: "issueClosed",
    secretToken: process.env.GITHUB_TOKEN,
    owner,
    repo: repository,
    issueNumber: `${issueNumber}`,
    payload: JSON.stringify({
      issue,
      issueComments,
      openAiKey: context.config.keys.openAi,
      pullRequestComments,
      botConfig: context.config,
      repoCollaborators,
      X25519_PRIVATE_KEY: env.X25519_PRIVATE_KEY,
      supabaseUrl: env.SUPABASE_URL,
      supabaseKey: env.SUPABASE_KEY,
    }),
  });

  return "Please wait until we get the result.";
}

async function dispatchWorkflow(owner: string, repo: string, workflowId: string, inputs: any) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({ ref: "master", inputs }),
  });
  if (res.status !== 204) {
    const errorMessage = await res.text();
    console.error(errorMessage);
  }
}

async function getEssentials(context: Context) {
  const payload = context.event.payload as Payload;
  const issue = payload.issue as Issue;
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  if (!issue) throw context.logger.error("Issue is not defined");
  const issueComments = await getAllIssueComments(context, issue.number);
  const owner = payload?.organization?.login || payload.repository.owner.login;
  if (!owner) throw context.logger.error("Owner is not defined");
  const repository = payload?.repository?.name;
  const issueNumber = issue.number;
  return { issue, runtime, logger, issueComments, owner, repository, issueNumber };
}

interface PreflightChecksParams {
  issue: Issue;
  issueComments: Comment[];
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

  const botComments = issueComments.filter((comment: Comment) => comment.user.type === "Bot" /* No Humans */);
  checkIfPermitsAlreadyPosted(context, botComments);
}

function checkIfPermitsAlreadyPosted(context: Context, botComments: Comment[]) {
  botComments.forEach((comment) => {
    const parsed = structuredMetadata.parse(comment.body);
    if (parsed) {
      console.trace({ parsed });
      if (parsed.caller === "generatePermits") {
        // in the comment metadata we store what function rendered the comment
        console.trace({ parsed });
        throw context.logger.error("Permit already posted");
      }
    }
  });
}
