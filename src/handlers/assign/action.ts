import Runtime from "../../bindings/bot-runtime";
import { calculateDurations, calculateLabelValue, closePullRequest } from "../../helpers";
import { getLinkedPullRequests } from "../../helpers/parser";
import { Label, Payload } from "../../types";
import { deadLinePrefix } from "../shared";

export async function startCommandHandler() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const config = runtime.botConfig;
  const logger = runtime.logger;
  const payload = context.payload as Payload;

  if (!payload.issue) {
    return logger.error("Issue is not defined");
  }

  const assignees = payload.issue?.assignees;

  // If no valid assignees exist, log a debug message and return
  if (assignees.length === 0) {
    return logger.warn("No assignees");
  }

  // Flatten assignees into a string
  const flattenedAssignees = assignees.reduce((acc, assignee) => `${acc} @${assignee.login}`, "");

  // Extract labels from payload
  const labels = payload.issue?.labels;

  // If no labels exist, log a debug message and return
  if (!labels) {
    return logger.warn(`No labels to calculate timeline`);
  }

  // Filter out labels that match the time labels defined in the config
  const timeLabelsAssigned: Label[] = labels.filter((label) =>
    typeof label === "string" || typeof label === "object"
      ? config.price.timeLabels.some((item) => item.name === label.name)
      : false
  );

  if (timeLabelsAssigned.length == 0) {
    return logger.debug(`No labels to calculate timeline`);
  }

  // Sort labels by weight and select the one with the smallest weight
  const sortedLabels = timeLabelsAssigned
    .sort((a, b) => {
      const fullLabelA = labels.find((label) => label.name === a.name);
      const fullLabelB = labels.find((label) => label.name === b.name);

      if (!fullLabelA || !fullLabelB) {
        return 0; // return a default value
      }

      return calculateLabelValue(fullLabelA) - calculateLabelValue(fullLabelB);
    })
    .map((label) => labels.find((fullLabel) => fullLabel.name === label.name));

  // Filter out undefined values
  const validSortedLabels = sortedLabels.filter((label) => label !== undefined);

  // Calculate the duration for the target label
  const labelDuration = calculateDurations(validSortedLabels as Label[]);
  const shortestDurationLabel = labelDuration[0];

  // Calculate the end date based on the current date and the label duration
  const currentDate = new Date();
  const endDate = new Date(currentDate.getTime() + shortestDurationLabel * 1000);

  // Format the commit message
  const commitMessage = `${flattenedAssignees} ${deadLinePrefix} ${endDate.toISOString()}`;
  logger.debug("Creating an issue comment", { commitMessage });

  // Add the commit message as a comment to the issue
  // await addCommentToIssue(commitMessage, payload.issue?.number);
  return logger.info(commitMessage);
}

export async function closePullRequestForAnIssue() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  if (!payload.issue?.number) {
    throw logger.error("Issue is not defined");
  }

  const linkedPullRequests = await getLinkedPullRequests({
    owner: payload.repository.owner.login,
    repository: payload.repository.name,
    issue: payload.issue.number,
  });

  if (!linkedPullRequests.length) {
    return logger.info(`No linked pull requests to close`);
  }

  logger.info(`Opened prs`, linkedPullRequests);
  let comment = `These linked pull requests are closed: `;
  for (let i = 0; i < linkedPullRequests.length; i++) {
    await closePullRequest(linkedPullRequests[i].number);
    comment += ` <a href="${linkedPullRequests[i].href}">#${linkedPullRequests[i].number}</a> `;
  }
  return logger.info(comment);
  // await addCommentToIssue(comment, payload.issue.number);
}
