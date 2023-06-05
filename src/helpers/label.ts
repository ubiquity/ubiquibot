import { Context } from "probot";
import { getBotConfig, getBotContext, getLogger } from "../bindings";
import { COLORS } from "../configs";
import { calculateBountyPrice } from "../handlers";
import { Label, Payload } from "../types";
import { deleteLabel } from "./issue";

export const listLabelsForRepo = async (per_page?: number, page?: number): Promise<Label[]> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const res = await context.octokit.rest.issues.listLabelsForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    per_page: per_page ?? 100,
    page: page ?? 1,
  });

  if (res.status === 200) {
    return res.data;
  }

  throw new Error(`Failed to fetch lists of labels, code: ${res.status}`);
};

export const createLabel = async (name: string, labelType?: keyof typeof COLORS): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    await context.octokit.rest.issues.createLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      name,
      color: COLORS[labelType ?? "default"],
    });
  } catch (err: unknown) {
    logger.debug(`Error creating a label: ${name}. Is it already there?`);
  }
};

export const getLabel = async (name: string): Promise<boolean> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    const res = await context.octokit.rest.issues.getLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      name,
    });
    return res.status === 200 ? true : false;
  } catch (err: unknown) {
    logger.debug(`Error creating a label: ${name}. Is it already there?`);
  }

  return false;
};

// Function to update labels based on the base rate difference
export const updateLabelsFromBaseRate = async (owner: string, repo: string, context: Context, labels: Label[], previousBaseRate: number) => {
  const logger = getLogger();
  const config = getBotConfig();

  const newLabels: string[] = [];
  const previousLabels: string[] = [];

  for (const timeLabel of config.price.timeLabels) {
    for (const priorityLabel of config.price.priorityLabels) {
      const targetPrice = calculateBountyPrice(timeLabel.weight, priorityLabel.weight, config.price.baseMultiplier);
      const targetPriceLabel = `Price: ${targetPrice} USD`;
      newLabels.push(targetPriceLabel);

      const previousTargetPrice = calculateBountyPrice(timeLabel.weight, priorityLabel.weight, previousBaseRate);
      const previousTargetPriceLabel = `Price: ${previousTargetPrice} USD`;
      previousLabels.push(previousTargetPriceLabel);
    }
  }

  let uniqueNewLabels = [...new Set(newLabels)];
  let uniquePreviousLabels = [...new Set(previousLabels)];

  let labelsFiltered: string[] = labels.map((obj) => obj["name"]);
  const usedLabels = uniquePreviousLabels.filter((value: string) => labelsFiltered.includes(value));

  logger.debug(`${usedLabels.length} previous labels used on issues`);

  try {
    for (const label of usedLabels) {
      if (label.startsWith("Price: ")) {
        let labelData = labels.find((obj) => obj["name"] === label) as Label;
        let index = uniquePreviousLabels.findIndex((obj) => obj === label);

        const exist = await getLabel(uniqueNewLabels[index]);
        if (exist) {
          // we have to delete first
          logger.debug(`Deleted ${uniqueNewLabels[index]}, updating it`);
          await deleteLabel(uniqueNewLabels[index]);
        }

        // we can update safely
        await context.octokit.issues.updateLabel({
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

        logger.debug(`Label updated: ${label} -> ${uniqueNewLabels[index]}`);
      }
    }
  } catch (error: any) {
    console.error("Error updating labels:", error.message);
  }
};
