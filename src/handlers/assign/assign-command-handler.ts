import { getLinkedPullRequests } from "../../helpers/get-linked-pull-requests";
import { calculateDurations, calculateLabelValue } from "../../helpers/shared";
import { Context } from "../../types/context";
import { Label } from "../../types/label";
import { GitHubPayload } from "../../types/payload";

export async function assignCommandHandler(context: Context) {
  const config = context.config;
  const logger = context.logger;
  const payload = context.event.payload as GitHubPayload;
  if (!payload.issue) {
    return logger.fatal("Issue is not defined");
  }

  const assignees = payload.issue.assignees;

  // If no valid assignees exist, log a debug message and return
  if (assignees.length === 0) {
    return logger.error("No assignees");
  }

  // Flatten assignees into a string
  const flattenedAssignees = assignees.reduce((acc, assignee) => `${acc} @${assignee?.login}`, "");

  // Extract labels from payload
  const labels = payload.issue?.labels;

  // If no labels exist, log a debug message and return
  if (!labels) {
    return logger.error(`No labels to calculate timeline`);
  }

  // Filter out labels that match the time labels defined in the config
  const timeLabelsAssigned: Label[] = labels.filter((assignedLabel) =>
    typeof assignedLabel === "string" || typeof assignedLabel === "object"
      ? config.labels.time.some((label) => label === assignedLabel.name)
      : false
  );

  if (timeLabelsAssigned.length == 0) {
    return logger.debug("No labels to calculate timeline");
  }

  // Sort labels by weight and select the one with the smallest weight
  const sortedLabels = timeLabelsAssigned
    .sort((a, b) => {
      const fullLabelA = labels.find((label) => label.name === a.name)?.name;
      const fullLabelB = labels.find((label) => label.name === b.name)?.name;

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

  // Format the comment
  const comment = `${flattenedAssignees} the deadline is at ${endDate.toISOString()}`;

  // Add the comment to the issue
  return comment;
}

export async function closePullRequestForAnIssue(context: Context) {
  const logger = context.logger;
  const payload = context.event.payload as GitHubPayload;
  if (!payload.issue?.number) {
    throw logger.fatal("Issue is not defined");
  }

  const linkedPullRequests = await getLinkedPullRequests(context, {
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
    await closePullRequest(context, linkedPullRequests[i].number);
    comment += ` <a href="${linkedPullRequests[i].href}">#${linkedPullRequests[i].number}</a> `;
  }
  return logger.info(comment);
  // await addCommentToIssue(comment, payload.issue.number);
}

async function closePullRequest(context: Context, pullNumber: number) {
  const payload = context.payload as GitHubPayload;
  try {
    await context.octokit.rest.pulls.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pullNumber,
      state: "closed",
    });
  } catch (err: unknown) {
    context.logger.fatal("Closing pull requests failed!", err);
  }
}
