import { getBotContext, getLogger } from "../bindings";
import { COLORS } from "../configs";
import { Label, Payload } from "../types";

export const listLabelsForRepo = async (per_page?: number, page?: number, all?: boolean): Promise<Label[] | string[]> => {
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
export async function updateLabelsFromBaseRate(owner: string, repo: string, labels: Label[], baseRateDifference: number) {
  const context = getBotContext();
  try {
    for (const label of labels) {
      if (label.name.startsWith("Price: ")) {
        const labelParts = label.name.split(": ");
        const prefix = labelParts[0];
        const valueAndSuffix = labelParts[1].split(" ");

        let labelValue = parseFloat(valueAndSuffix[0]);

        let updatedLabelValue =
          baseRateDifference > 0 ? (labelValue * (1 + baseRateDifference)).toFixed(0) : (labelValue / (1 - baseRateDifference)).toFixed(0);

        const suffix = valueAndSuffix.slice(1).join(" ");

        // Don't want to remove the +
        if (valueAndSuffix[0].includes("+")) {
          updatedLabelValue += "+";
        }

        const updatedLabelName = `${prefix}: ${updatedLabelValue} ${suffix}`;

        await context.octokit.issues.updateLabel({
          owner,
          repo,
          name: label.name,
          new_name: updatedLabelName,
          color: label.color,
          description: label.description,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        console.log(`Label updated: ${label.name} -> ${updatedLabelName}`);
      }
    }
  } catch (error) {
    console.error("Error updating labels:", error);
  }
}
