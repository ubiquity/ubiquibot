import { Context } from "../../../types/context";
import { GitHubEvent } from "../../../types/github-events";
export interface DelegatedComputeInputs {
  eventName: GitHubEvent;
  issueOwner: string;
  issueRepository: string;
  issueNumber: string;
  collaborators: string;
}

export const computeLocation = {
  //   // TODO: Make this configurable
  owner: "ubiquibot", //  "ubiquity",
  repository: "comment-incentives",
  workflowId: "compute.yml",
} as { owner: string; repository: string; workflowId: string };

export async function delegateCompute(context: Context, inputs: DelegatedComputeInputs) {
  // computeLocation.owner = context.payload?.organization?.login || context.payload.repository.owner.login;
  // if (!computeLocation.owner) {
  //   throw context.logger.error("Compute repository owner is not defined");
  // }
  const ref = await getDefaultBranch(context, computeLocation.owner, computeLocation.repository);

  // You must authenticate using an access token with the repo scope to use this endpoint. GitHub Apps must have the actions:write permission to use this endpoint.
  // For more information, see "Creating a personal access token for the command line."
  // https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
  const response = await context.octokit.actions.createWorkflowDispatch({
    owner: computeLocation.owner,
    repo: computeLocation.repository,
    workflow_id: computeLocation.workflowId,
    ref,
    inputs: inputs as unknown as { [key: string]: string },
  });
  if (response.status !== 204) {
    throw new Error(`Failed to dispatch workflow. Status: ${response.status}`);
  }
}

async function getDefaultBranch(context: Context, owner: string, repository: string) {
  const computeRepositoryFull = await context.octokit.repos.get({
    owner: owner,
    repo: repository,
  });
  return computeRepositoryFull.data.default_branch;
}
