import { Octokit } from "@octokit/rest";
import { Context } from "../../../../types/context";

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
  const installation = installations.data.find((inst) => inst.account?.login === org);
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
  const installationOctokit = (await getInstallationOctokitForOrg(context, options.org)) as InstanceType<
    typeof Octokit
  > & { token: string };

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
