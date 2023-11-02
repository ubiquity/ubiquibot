import Runtime from "../../bindings/bot-runtime";

import { getPreviousFileContent, listLabelsForRepo, updateLabelsFromBaseRate } from "../../helpers";
import { Label, PushPayload, Context } from "../../types";
import { parseYamlConfig } from "../../utils/get-config";

export async function updateBaseRate(context: Context, filePath: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  // Get default branch from ref
  const payload = context.event.payload as PushPayload;
  const branch = payload.ref?.split("refs/heads/")[1];
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  // get previous config
  const previousFileContent = await getPreviousFileContent(context, owner, repo, branch, filePath);

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
  const repoLabels = await listLabelsForRepo(context);

  if (repoLabels.length === 0) {
    throw logger.warn("No labels on this repo");
  }

  return await updateLabelsFromBaseRate(context, owner, repo, repoLabels as Label[], previousBaseRate);
}
