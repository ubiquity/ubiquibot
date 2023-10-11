import Runtime from "../../bindings/bot-runtime";
import { addCommentToIssue, closePullRequest, calculateWeight, calculateDuration } from "../../helpers";
import { gitLinkedPrParser } from "../../helpers/parser";
import { Payload, LabelFromConfig } from "../../types";
import { deadLinePrefix } from "../shared";

const exclude_accounts: string[] = [];
export async function startCommandHandler() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const config = runtime.botConfig;
  const logger = runtime.logger;
  const payload = context.payload as Payload;

  if (!payload.issue) {
    throw new Error("Issue is not defined");
  }

  // Extract assignees from payload and filter out excluded accounts
  const assignees = payload.issue?.assignees?.filter((assignee) => !exclude_accounts.includes(assignee.login)) || [];

  // If no valid assignees exist, log a debug message and return
  if (assignees.length === 0) {
    throw new Error("No valid assignees");
  }

  // Flatten assignees into a string
  const flattenedAssignees = assignees.reduce((acc, assignee) => `${acc} @${assignee.login}`, "");

  // Extract labels from payload
  const labels = payload.issue?.labels;

  // If no labels exist, log a debug message and return
  if (!labels) {
    logger.debug(`No labels to calculate timeline`);
    return;
  }

  // Filter out labels that match the time labels defined in the config
  const timeLabelsAssigned: LabelFromConfig[] = labels.filter((label) =>
    typeof label === "string" || typeof label === "object"
      ? config.price.timeLabels.some((item) => item.name === label.name)
      : false
  );

  if (timeLabelsAssigned.length == 0) {
    logger.debug(`No labels to calculate timeline`);
    return;
  }

  // Sort labels by weight and select the one with the smallest weight
  const sortedLabels = timeLabelsAssigned.sort((a, b) => calculateWeight(a) - calculateWeight(b));
  const targetLabel = sortedLabels[0];

  // Calculate the duration for the target label
  const labelDuration = calculateDuration(targetLabel);

  // If the duration is not configured, log a debug message and return
  if (!labelDuration) {
    logger.debug(`Missing configuration for time label: ${targetLabel.name}`);
    return;
  }

  // Calculate the end date based on the current date and the label duration
  const currentDate = new Date();
  const endDate = new Date(currentDate.getTime() + labelDuration * 1000);

  // Format the commit message
  const commitMessage = `${flattenedAssignees} ${deadLinePrefix} ${endDate.toUTCString().replace("GMT", "UTC")}`;
  logger.debug(`Creating an issue comment, commit_msg: ${commitMessage}`);

  // Add the commit message as a comment to the issue
  await addCommentToIssue(commitMessage, payload.issue?.number);
}

export async function closePullRequestForAnIssue(): Promise<void> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  if (!payload.issue?.number) return;

  const prs = await gitLinkedPrParser({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
  });

  if (!prs.length) return;

  logger.info(`Opened prs for this issue: ${JSON.stringify(prs)}`);
  let comment = `These linked pull requests are closed: `;
  for (let i = 0; i < prs.length; i++) {
    await closePullRequest(prs[i].prNumber);
    comment += ` <a href="${prs[i].prHref}">#${prs[i].prNumber}</a> `;
  }
  await addCommentToIssue(comment, payload.issue.number);
}
