import { Context } from "../../types/context";
import { Label } from "../../types/label";
import { GitHubPushPayload } from "../../types/payload";

import { deleteLabel } from "../../helpers/issue";
import { listLabelsForRepo } from "../../helpers/label";
import { calculateLabelValue } from "../../helpers/shared";
import { parseYaml } from "../../utils/generate-configuration";
import { labelExists } from "../pricing/pricing-label";
import { calculateTaskPrice } from "../shared/pricing";

export async function updateBaseRate(context: Context, filePath: string) {
  const logger = context.logger;
  // Get default branch from ref
  const payload = context.event.payload as GitHubPushPayload;
  const branch = payload.ref?.split("refs/heads/")[1];
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  // get previous config
  const previousFileContent = await getPreviousFileContent(context, owner, repo, branch, filePath);

  if (!previousFileContent) {
    throw logger.fatal("Getting previous file content failed");
  }
  const previousConfigRaw = Buffer.from(previousFileContent, "base64").toString();
  const previousConfigParsed = parseYaml(previousConfigRaw);

  if (!previousConfigParsed || !previousConfigParsed.payments.basePriceMultiplier) {
    throw logger.error("No multiplier found in previous config");
  }

  const previousBaseRate = previousConfigParsed.payments.basePriceMultiplier;

  if (!previousBaseRate) {
    throw logger.error("No base rate found in previous config");
  }

  // fetch all labels
  const repoLabels = await listLabelsForRepo(context);

  if (repoLabels.length === 0) {
    throw logger.error("No labels on this repo");
  }

  return await updateLabelsFromBaseRate(context, owner, repo, repoLabels as Label[], previousBaseRate);
}

// Get the previous file content
async function getPreviousFileContent(context: Context, owner: string, repo: string, branch: string, filePath: string) {
  const logger = context.logger;

  try {
    // Get the latest commit of the branch
    const branchData = await context.event.octokit.repos.getBranch({
      owner,
      repo,
      branch,
    });
    const latestCommitSha = branchData.data.commit.sha;

    // Get the commit details
    const commitData = await context.event.octokit.repos.getCommit({
      owner,
      repo,
      ref: latestCommitSha,
    });

    // Find the file in the commit tree
    const file = commitData.data.files ? commitData.data.files.find((file) => file.filename === filePath) : undefined;
    if (file) {
      // Retrieve the previous file content from the commit's parent
      const previousCommitSha = commitData.data.parents[0].sha;
      const previousCommit = await context.event.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: previousCommitSha,
      });

      // Retrieve the previous file tree
      const previousTreeSha = previousCommit.data.tree.sha;
      const previousTree = await context.event.octokit.git.getTree({
        owner,
        repo,
        tree_sha: previousTreeSha,
        recursive: "true",
      });

      // Find the previous file content in the tree
      const previousFile = previousTree.data.tree.find((item) => item.path === filePath);
      if (previousFile && previousFile.sha) {
        // Get the previous file content
        const previousFileContent = await context.event.octokit.git.getBlob({
          owner,
          repo,
          file_sha: previousFile.sha,
        });
        return previousFileContent.data.content;
      }
    }
    return null;
  } catch (error: unknown) {
    logger.debug("Error retrieving previous file content.", { error });
    return null;
  }
}
// Function to update labels based on the base rate difference
async function updateLabelsFromBaseRate(
  context: Context,
  owner: string,
  repo: string,
  labels: Label[],
  previousBaseRate: number
) {
  const logger = context.logger;
  const config = context.config;

  const newLabels: string[] = [];
  const previousLabels: string[] = [];

  for (const timeLabel of config.labels.time) {
    for (const priorityLabel of config.labels.priority) {
      const targetPrice = calculateTaskPrice(
        context,
        calculateLabelValue(timeLabel),
        calculateLabelValue(priorityLabel),
        config.payments.basePriceMultiplier
      );
      const targetPriceLabel = `Price: ${targetPrice} USD`;
      newLabels.push(targetPriceLabel);

      const previousTargetPrice = calculateTaskPrice(
        context,
        calculateLabelValue(timeLabel),
        calculateLabelValue(priorityLabel),
        previousBaseRate
      );
      const previousTargetPriceLabel = `Price: ${previousTargetPrice} USD`;
      previousLabels.push(previousTargetPriceLabel);
    }
  }

  const uniqueNewLabels = [...new Set(newLabels)];
  const uniquePreviousLabels = [...new Set(previousLabels)];

  const labelsFiltered: string[] = labels.map((obj) => obj["name"]);
  const usedLabels = uniquePreviousLabels.filter((value: string) => labelsFiltered.includes(value));

  logger.debug("Got used labels: ", { usedLabels });

  for (const label of usedLabels) {
    if (label.startsWith("Price: ")) {
      const labelData = labels.find((obj) => obj["name"] === label) as Label;
      const index = uniquePreviousLabels.findIndex((obj) => obj === label);

      const doesExist = await labelExists(context, uniqueNewLabels[index]);
      if (doesExist) {
        // we have to delete first
        logger.debug("Label already exists, deleting it", { label });
        await deleteLabel(context, uniqueNewLabels[index]);
      }

      // we can update safely
      await context.event.octokit.issues.updateLabel({
        owner,
        repo,
        name: label,
        new_name: uniqueNewLabels[index],
        color: labelData.color,
        description: labelData.description,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      logger.debug("Label updated", { label, to: uniqueNewLabels[index] });
    }
  }
}
async function deleteLabel(context: Context, label: string) {
  const payload = context.payload;
  try {
    const response = await context.octokit.rest.search.issuesAndPullRequests({
      q: `repo:${payload.repository.owner.login}/${payload.repository.name} label:"${label}" state:open`,
    });
    if (response.data.items.length === 0) {
      //remove label
      await context.octokit.rest.issues.deleteLabel({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        name: label,
      });
    }
  } catch (e: unknown) {
    context.logger.fatal("Deleting label failed!", e);
  }
}
