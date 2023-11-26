import { getPreviousFileContent } from "../../helpers/file";
import { listLabelsForRepo, updateLabelsFromBaseRate } from "../../helpers/label";
import { Context } from "../../types/context";
import { Label } from "../../types/label";
import { PushPayload } from "../../types/payload";

import { parseYaml } from "../../utils/generate-configuration";

export async function updateBaseRate(context: Context, filePath: string) {
  const logger = context.logger;
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

  if (!previousConfigParsed || !previousConfigParsed.payments.basePriceMultiplier) {
    throw logger.warn("No multiplier found in previous config");
  }

  const previousBaseRate = previousConfigParsed.payments.basePriceMultiplier;

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
