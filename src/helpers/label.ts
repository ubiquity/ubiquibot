import { Context } from "../types/context";
import { Label } from "../types/label";
import { GitHubPayload } from "../types/payload";

// cspell:disable
const COLORS = { default: "ededed", price: "1f883d" };
// cspell:enable

export async function listLabelsForRepo(context: Context): Promise<Label[]> {
  const payload = context.event.payload as GitHubPayload;

  const res = await context.event.octokit.rest.issues.listLabelsForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    per_page: 100,
    page: 1,
  });

  if (res.status === 200) {
    return res.data;
  }

  throw context.logger.fatal("Failed to fetch lists of labels", { status: res.status });
}

export async function createLabel(
  context: Context,
  name: string,
  labelType = "default" as keyof typeof COLORS
): Promise<void> {
  const payload = context.event.payload as GitHubPayload;
  await context.event.octokit.rest.issues.createLabel({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    name,
    color: COLORS[labelType],
  });
}
