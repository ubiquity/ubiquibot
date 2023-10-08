import { Context } from "probot";
import Runtime from "../bindings/bot-runtime";
import { calculateTaskPrice } from "../handlers";
import { Label, Payload } from "../types";
import { deleteLabel } from "./issue";
import { calculateWeight } from "../helpers";

// cspell:disable
export const COLORS = {
  default: "ededed",
  price: "1f883d",
};
// cspell:enable

export const listLabelsForRepo = async (per_page?: number, page?: number): Promise<Label[]> => {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
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
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
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
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
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
export const updateLabelsFromBaseRate = async (
  owner: string,
  repo: string,
  context: Context,
  labels: Label[],
  previousBaseRate: number
) => {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const config = runtime.botConfig;

  const newLabels: string[] = [];
  const previousLabels: string[] = [];

  for (const timeLabel of config.price.timeLabels) {
    for (const priorityLabel of config.price.priorityLabels) {
      const targetPrice = calculateTaskPrice(
        calculateWeight(timeLabel),
        calculateWeight(priorityLabel),
        config.price.baseMultiplier
      );
      const targetPriceLabel = `Price: ${targetPrice} USD`;
      newLabels.push(targetPriceLabel);

      const previousTargetPrice = calculateTaskPrice(
        calculateWeight(timeLabel),
        calculateWeight(priorityLabel),
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

  logger.debug(`${usedLabels.length} previous labels used on issues`);

  try {
    for (const label of usedLabels) {
      if (label.startsWith("Price: ")) {
        const labelData = labels.find((obj) => obj["name"] === label) as Label;
        const index = uniquePreviousLabels.findIndex((obj) => obj === label);

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
  } catch (error: unknown) {
    logger.error(`Error updating labels, error: ${error}`);
  }
};
