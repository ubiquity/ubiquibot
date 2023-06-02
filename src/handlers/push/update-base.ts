import { Context } from "probot";
import { getLogger } from "../../bindings";
import { getPreviousFileContent, listLabelsForRepo, updateLabelsFromBaseRate } from "../../helpers";
import { Label, PushPayload } from "../../types";
import { parseYAML } from "../../utils/private";

export const updateBaseRate = async (context: Context, payload: PushPayload, filePath: string) => {
  const logger = getLogger();
  // Get default branch from ref
  const branch = payload.ref?.split("refs/heads/")[1];
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  // get previous config
  const preFileContent = await getPreviousFileContent(owner, repo, branch, filePath);

  const previousContent = Buffer.from(preFileContent!, "base64").toString();
  const previousConfig = await parseYAML(previousContent);

  if (!previousConfig["base-multiplier"]) {
    logger.debug("No multiplier found in file object");
    return;
  }

  const previousBaseRate = previousConfig["base-multiplier"];

  // fetch all labels
  const repoLabels = await listLabelsForRepo(100, 1, true);

  if (repoLabels.length === 0) {
    logger.debug("No labels on this repo");
    return;
  }

  updateLabelsFromBaseRate(owner, repo, context, repoLabels as Label[], previousBaseRate);
};
