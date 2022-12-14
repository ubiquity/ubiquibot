import {  getBotContext } from "../bindings";
import { COLORS } from "../configs";
import { Payload } from "../types";

export const listLabelsForRepo = async (): Promise<string[]> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const res = await context.octokit.rest.issues.listLabelsForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
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
