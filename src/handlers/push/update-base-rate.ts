import { Context } from "probot";
import Runtime from "../../bindings/bot-runtime";

import { getPreviousFileContent, listLabelsForRepo, updateLabelsFromBaseRate } from "../../helpers";
import { Label, PushPayload } from "../../types";
import { parseYaml } from "../../utils/generate-configuration";

export async function updateBaseRate(context: Context, payload: PushPayload, filePath: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  // Get default branch from ref
  const branch = payload.ref?.split("refs/heads/")[1];
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  // get previous config
  const previousFileContent = await getPreviousFileContent(owner, repo, branch, filePath);

  if (!previousFileContent) {
    throw logger.error("Getting previous file content failed");
  }
  const previousConfigRaw = Buffer.from(previousFileContent, "base64").toString();
  const previousConfigParsed = parseYaml(previousConfigRaw);

  if (!previousConfigParsed || !previousConfigParsed.basePriceMultiplier) {
    throw logger.warn("No multiplier found in previous config");
  }

  const previousBaseRate = previousConfigParsed.basePriceMultiplier;

  if (!previousBaseRate) {
    throw logger.warn("No base rate found in previous config");
  }

  // fetch all labels
  const repoLabels = await listLabelsForRepo();

  if (repoLabels.length === 0) {
    throw logger.warn("No labels on this repo");
  }

  return await updateLabelsFromBaseRate(owner, repo, context, repoLabels as Label[], previousBaseRate);
}
