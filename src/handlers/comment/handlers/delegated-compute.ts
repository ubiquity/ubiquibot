import { Context } from "../../../types/context";
import { GitHubEvent } from "../../../types/payload";
export interface DelegatedComputeInputs {
  eventName: GitHubEvent;
  issueOwner: string;
  issueRepository: string;
  issueNumber: number;
}

export const computeLocation = {
  // TODO: Make this configurable
  owner: "ubiquity",
  repository: "ubiquibot-config",
  workflow: "compute.yml",
};

export async function delegateCompute(context: Context, inputs: DelegatedComputeInputs) {
  const owner = computeLocation.owner;
  const repo = computeLocation.repository;
  const workflowId = computeLocation.workflow;
  const ref = await getDefaultBranch(context);

  // You must authenticate using an access token with the repo scope to use this endpoint. GitHub Apps must have the actions:write permission to use this endpoint.
  // For more information, see "Creating a personal access token for the command line."
  // https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
  const response = await context.octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref,
    inputs: inputs as unknown as { [key: string]: string },
  });
  if (response.status !== 204) {
    throw new Error(`Failed to dispatch workflow. Status: ${response.status}`);
  }
}

async function getDefaultBranch(context: Context) {
  const computeRepositoryFull = await context.octokit.repos.get({
    owner: computeLocation.owner,
    repo: computeLocation.repository,
  });
  return computeRepositoryFull.data.default_branch;
}
