import { getBotContext, getLogger } from "../bindings";
import { COLORS } from "../configs";
import { Payload } from "../types";

export const listLabelsForRepo = async (per_page?: number, page?: number, all?: boolean): Promise<string[] | {}> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const res = await context.octokit.rest.issues.listLabelsForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    per_page: per_page ?? 100,
    page: page ?? 1,
  });

  if (res.status === 200) {
    return all ? res.data : res.data.map((i) => i.name);
  }

  throw new Error(`Failed to fetch lists of labels, code: ${res.status}`);
};

export const createLabel = async (name: string): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    await context.octokit.rest.issues.createLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      name,
      color: COLORS.price,
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
export async function updateLabelsFromBaseRate(owner: string, repo: string, labels: string[], baseRateDifference: number) {
  try {
    for (const label of labels) {
      if (label.startsWith("Price: ")) {
        const currentLabelValue = parseFloat(label.replace("Price: ", ""));
        const updatedLabelValue =
          baseRateDifference > 0 ? (currentLabelValue * (1 + baseRateDifference)).toFixed(2) : (currentLabelValue / (1 - baseRateDifference)).toFixed(2);
        const updatedLabelName = `Price: ${updatedLabelValue}`;

        await octokit.issues.updateLabel({
          owner,
          repo,
          current_name: label,
          name: updatedLabelName,
          color: label.color,
          description: label.description,
        });

        console.log(`Label updated: ${label.name} -> ${updatedLabelName}`);
      }
    }
  } catch (error) {
    console.error("Error updating labels:", error);
  }
}
