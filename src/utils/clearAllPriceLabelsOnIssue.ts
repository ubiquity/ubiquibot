import { Context } from "probot";
import { Payload } from "../interfaces/Payload";

export async function clearAllPriceLabelsOnIssue(context: Context) {
  const payload = context.payload as Payload;

  const labels = payload.issue.labels;
  const issuePrices = labels.filter((label) => label.name.startsWith("Price:"));

  if (!issuePrices.length)
    return;

  await context.octokit.issues.removeLabel({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    name: issuePrices[0].name,
    // color: "00ff00",
  });
}
