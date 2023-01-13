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

export const listIssuesForRepo = async (state: 'open' | 'closed' | 'all' = 'open', per_page: number = 100, page: number = 1 ) => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const response = await context.octokit.issues.listForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    per_page,
    page
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

export const getCommentsOfIssue = async (issue_number: number): Promise<any> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  let result;
  try {
    const response = await context.octokit.rest.issues.listComments({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
    });

    if (response.data) result = response.data;
  } catch (e: unknown) {
    context.log.debug(`Listing issue comments failed!, reason: ${e}`);
  }

  return result;
};

export const removeAssignees = async (issue_number: number, assignees: string[]): Promise<void> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.removeAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      assignees,
    });
  } catch (e: unknown) {
    context.log.debug(`Removing assignees failed!, reason: ${e}`);
  }
};

export const addAssignees = async (issue_number: number, assignees: string[]): Promise<void> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.addAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      assignees,
    });
  } catch (e: unknown) {
    context.log.debug(`Adding assignees failed!, reason: ${e}`);
  }
};

