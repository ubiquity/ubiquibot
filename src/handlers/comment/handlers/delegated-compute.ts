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
  const endpoint = `https://api.github.com/repos/${computeLocation.owner}/${computeLocation.repository}/actions/workflows/${computeLocation.workflow}/dispatches`;

  const response = await fetch(endpoint, await constructFetchOptions(context, inputs));
  if (response.status !== 204) {
    const errorMessage = await response.text();
    throw errorMessage;
  } else {
    return endpoint;
  }
}

async function constructFetchOptions(context: Context, inputs: DelegatedComputeInputs) {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    } as {
      Accept: string;
      Authorization?: string;
    },
    body: JSON.stringify({
      ref: await getDefaultBranch(context),
      inputs,
    }),
  };
}

async function getDefaultBranch(context: Context) {
  const computeRepositoryFull = await context.octokit.repos.get({
    owner: computeLocation.owner,
    repo: computeLocation.repository,
  });
  return computeRepositoryFull.data.default_branch;
}
