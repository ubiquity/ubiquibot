import { getBotContext } from "../bindings";
import { Payload } from "../types";

export const clearAllPriceLabelsOnIssue = async (): Promise<void> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const labels = payload.issue.labels;
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));

  if (!issuePrices.length) return;

  await context.octokit.issues.removeLabel({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    name: issuePrices[0].name.toString(),
  });
};

export async function addLabelToIssue(labelName: string) {
  const context = getBotContext();
  const payload = context.payload as Payload;

  await context.octokit.issues.addLabels({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    labels: [labelName],
    // color: "00ff00",
  });
}
