import { Context } from "probot";
import { Payload } from "../interfaces/Payload";

export async function addLabelToIssue(context: Context, labelName: string) {
  const payload = context.payload as Payload;

  await context.octokit.issues.addLabels({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    labels: [labelName],
    // color: "00ff00",
  });
}
