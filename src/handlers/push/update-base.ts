import { getLogger } from "../../bindings";
import { getPreviousFileContent, listLabelsForRepo, updateLabelsFromBaseRate } from "../../helpers";
import { BotContext, Label, PushPayload } from "../../types";
import { parseYAML } from "../../utils/private";

export const updateBaseRate = async (context: BotContext, payload: PushPayload, filePath: string) => {
  const logger = getLogger();
  // Get default branch from ref
  const branch = payload.ref?.split("refs/heads/")[1];
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  // get previous config
  const preFileContent = await getPreviousFileContent(context, owner, repo, branch, filePath);

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
  const repoLabels = await listLabelsForRepo(context);

  if (repoLabels.length === 0) {
    logger.debug("No labels on this repo");
    return;
  }

  await updateLabelsFromBaseRate(context, owner, repo, repoLabels as Label[], previousBaseRate);
};
