import { Context } from "probot";
import { getLogger } from "../../bindings";
import { getPreviousFileContent, listLabelsForRepo } from "../../helpers";
import { GithubContent, PushPayload } from "../../types";
import { parseYAML } from "../../utils/private";

export const updateBaseRate = async (context: Context, payload: PushPayload, filePath: string) => {
  const logger = getLogger();
  // Get default branch from ref
  const branch = payload.ref?.split("refs/heads/")[1];
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  // Get the content of the ubiquibot-config.yml file
  const { data: file } = await context.octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: branch,
  });

  // get previous config
  const preFileContent = await getPreviousFileContent(owner, repo, branch, filePath);

  // Decode the content from base64 and parse it as YAML
  const currentContentFile = Object.assign({} as GithubContent, file);

  const currentContent = Buffer.from(currentContentFile.content!, "base64").toString();
  const currentConfig = await parseYAML(currentContent);

  const previousContent = Buffer.from(preFileContent!, "base64").toString();
  const previousConfig = await parseYAML(previousContent);

  if (!previousConfig.baseMultiplier || !currentConfig.baseMultiplier) {
    logger.debug("No multiplier found in file object");
    return;
  }

  const previousBaseRate = previousConfig.baseMultiplier;
  const currentBaseRate = currentConfig.baseMultiplier;

  const baseRateDifference = (currentBaseRate - previousBaseRate) / previousBaseRate;

  // fetch all labels
  const repoLabels = await listLabelsForRepo(100, 1, true);

  console.log(repoLabels, baseRateDifference);
};
