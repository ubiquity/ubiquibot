import { Context } from "probot";
import Runtime from "../../bindings/bot-runtime";

import { getPreviousFileContent, listLabelsForRepo, updateLabelsFromBaseRate } from "../../helpers";
import { Label, PushPayload } from "../../types";
import { parseYAML } from "../../utils/private";

export async function updateBaseRate(context: Context, payload: PushPayload, filePath: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  // Get default branch from ref
  const branch = payload.ref?.split("refs/heads/")[1];
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  // get previous config
  const preFileContent = await getPreviousFileContent(owner, repo, branch, filePath);

  if (!preFileContent) {
    logger.debug("Getting previous file content failed");
    return;
  }
  const previousContent = Buffer.from(preFileContent, "base64").toString();
  const previousConfig = await parseYAML(previousContent);

  if (!previousConfig || !previousConfig["priceMultiplier"]) {
    logger.debug("No multiplier found in file object");
    return;
  }

  const previousBaseRate = previousConfig["priceMultiplier"];

  // fetch all labels
  const repoLabels = await listLabelsForRepo();

  if (repoLabels.length === 0) {
    return logger.debug("No labels on this repo");
  }

  return await updateLabelsFromBaseRate(owner, repo, context, repoLabels as Label[], previousBaseRate);
}
