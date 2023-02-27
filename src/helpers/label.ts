import { getBotContext } from "../bindings";
import { COLORS } from "../configs";
import { Payload } from "../types";

export const listLabelsForRepo = async (per_page?: number, page?: number): Promise<string[]> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const res = await context.octokit.rest.issues.listLabelsForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    per_page: per_page ?? 100,
    page: page ?? 1,
  });

  if (res.status === 200) {
    return res.data.map((i) => i.name);
  }

  throw new Error(`Failed to fetch lists of labels, code: ${res.status}`);
};

export const createLabel = async (name: string): Promise<void> => {
  const context = getBotContext();
  const payload = context.payload as Payload;
  try {
    await context.octokit.rest.issues.createLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      name,
      color: COLORS.price,
    });
  } catch (err: unknown) {
    context.log.debug(`Error creating a label: ${name}. Is it already there?`);
  }
};

export const getLabel = async (name: string): Promise<boolean> => {
  const context = getBotContext();
  const payload = context.payload as Payload;
  try {
    const res = await context.octokit.rest.issues.getLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      name,
    });
    return res.status === 200 ? true : false;
  } catch (err: unknown) {
    context.log.debug(`Error creating a label: ${name}. Is it already there?`);
  }

  return false;
};
