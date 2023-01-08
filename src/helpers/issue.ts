import { getBotContext } from "../bindings";
import { Payload } from "../types";

export const clearAllPriceLabelsOnIssue = async (): Promise<void> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const labels = payload.issue!.labels;
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));

  if (!issuePrices.length) return;

  await context.octokit.issues.removeLabel({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue!.number,
    name: issuePrices[0].name.toString(),
  });
};

export const addLabelToIssue = async (labelName: string) => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  await context.octokit.issues.addLabels({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue!.number,
    labels: [labelName],
  });
};

export const listIssuesForRepo = async () => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const response = await context.octokit.issues.listForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
  });

  if (response.status === 200) {
    return response.data;
  } else {
    return [];
  }
};

export const addCommentToIssue = async (msg: string) => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  
  try {
    await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue!.number,
      body: msg,
    });
  } catch (e: unknown) {
    context.log.debug(`Adding a comment failed!, reason: ${e}`);
  }
};
