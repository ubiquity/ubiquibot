import { Octokit } from "@octokit/rest";
import { Context } from "../../../../types/context";
import { GitHubEvent, GitHubUser } from "../../../../types/payload";

interface WorkflowDispatchOptions {
  org: string;
  repo: string;
  workflowId: string;
  ref: string;
  inputs?: { [key: string]: string };
}

async function getInstallationOctokitForOrg(context: Context, org: string) {
  // You might need to adapt this part based on the actual event type your app handles
  const installations = await context.octokit.apps.listInstallations();
  // context.logger.debug("installations", installations);
  const installation = installations.data.find((inst) => inst.account?.login === org) as ExampleResponse;
  // context.logger.debug("installation", installation);

  if (!installation) {
    throw new Error(`No installation found for organization: ${org}`);
  }

  return context.octokit.auth({
    type: "installation",
    installationId: installation.id,
  }) as Promise<InstanceType<typeof Octokit>>;
}

export async function dispatchWorkflow(context: Context, options: WorkflowDispatchOptions) {
  const installationOctokit = (await getInstallationOctokitForOrg(
    context,
    options.org
  )) as unknown as ExampleInstallation; // I took a real response so ignore this type cast.

  context.logger.debug("installationOctokit", installationOctokit);
  const authenticatedOctokit = new Octokit({ auth: installationOctokit.token });

  console.trace(options.inputs);

  return await authenticatedOctokit.actions.createWorkflowDispatch({
    owner: options.org,
    repo: options.repo,
    workflow_id: options.workflowId,
    ref: options.ref,
    inputs: options.inputs,
  });
}

interface ExampleResponse {
  id: 37628281;
  account: GitHubUser;
  repository_selection: "all";
  access_tokens_url: "https://api.github.com/app/installations/37628281/access_tokens";
  repositories_url: "https://api.github.com/installation/repositories";
  html_url: "https://github.com/organizations/ubiquibot/settings/installations/37628281";
  app_id: 236521;
  app_slug: "ubiquibot";
  target_id: 133917611;
  target_type: "Organization";
  permissions: {
    issues: "write";
    actions: "write";
    members: "read";
    contents: "write";
    metadata: "read";
    pull_requests: "write";
  };
  events: GitHubEvent[];
  created_at: "2023-05-17T20:52:25.000Z";
  updated_at: "2023-12-23T09:58:37.000Z";
  single_file_name: null;
  has_multiple_single_files: false;
  single_file_paths: [];
  suspended_by: null;
  suspended_at: null;
  caller: "getInstallationOctokitForOrg";
  revision: "4c15837";
}

interface ExampleInstallation {
  type: "token";
  tokenType: "installation";
  token: "ghs_Pm5WyIfH7OjYg6uDv9MQGflRuaGeub2LYHu9";
  installationId: 37628281;
  permissions: {
    members: "read";
    actions: "write";
    contents: "write";
    issues: "write";
    metadata: "read";
    pull_requests: "write";
  };
  createdAt: "2023-12-23T15:08:59.876Z";
  expiresAt: "2023-12-23T16:08:59Z";
  repositorySelection: "all";
  caller: "dispatchWorkflow";
  revision: "4c15837";
}
