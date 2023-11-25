import {
  addAssignees,
  calculateDurations,
  getAssignedIssues,
  getAvailableOpenedPullRequests,
} from "../../../../helpers";
import { Context } from "../../../../types/context";
import { User, IssueType, Payload } from "../../../../types/payload";

import { isParentIssue } from "../../../pricing";
import structuredMetadata from "../../../shared/structured-metadata";
import { assignTableComment } from "../table";
import { checkTaskStale } from "./check-task-stale";
import { generateAssignmentComment } from "./generate-assignment-comment";
import { getMultiplierInfoToDisplay } from "./get-multiplier-info-to-display";
import { getTimeLabelsAssigned } from "./get-time-labels-assigned";

export async function assign(context: Context, body: string) {
  const logger = context.logger;
  const config = context.config;
  const payload = context.event.payload as Payload;
  const issue = payload.issue;
  const {
    miscellaneous: { maxConcurrentTasks },
    timers: { taskStaleTimeoutDuration },
    disabledCommands,
  } = context.config;

  const isStartDisabled = disabledCommands.some((command: string) => command === "start");

  logger.info("Received '/start' command", { sender: payload.sender.login, body });

  if (!issue) {
    throw logger.warn(`Skipping '/start' because of no issue instance`);
  }

  if (isStartDisabled) {
    throw logger.warn("The `/assign` command is disabled for this repository.");
  }

  if (issue.body && isParentIssue(issue.body)) {
    throw logger.warn(
      "Please select a child issue from the specification checklist to work on. The '/start' command is disabled on parent issues."
    );
  }

  const openedPullRequests = await getAvailableOpenedPullRequests(context, payload.sender.login);
  logger.info(
    `Opened Pull Requests with approved reviews or with no reviews but over 24 hours have passed: ${JSON.stringify(
      openedPullRequests
    )}`
  );

  const assignedIssues = await getAssignedIssues(context, payload.sender.login);
  logger.info("Max issue allowed is", maxConcurrentTasks);

  // check for max and enforce max
  if (assignedIssues.length - openedPullRequests.length >= maxConcurrentTasks) {
    throw logger.warn("Too many assigned issues, you have reached your max limit", {
      maxConcurrentTasks,
    });
  }

  if (issue.state == IssueType.CLOSED) {
    throw logger.warn("Skipping '/start' since the issue is closed");
  }
  const assignees: User[] = (payload.issue?.assignees ?? []).filter(Boolean) as User[];

  if (assignees.length !== 0) {
    throw logger.warn("Skipping '/start' since the issue is already assigned");
  }

  // ==== preamble checks completed ==== //

  const labels = issue.labels;
  const priceLabel = labels.find((label) => label.name.startsWith("Price: "));

  let duration: number | null = null;
  if (!priceLabel) {
    throw logger.warn("No price label is set, so this is not ready to be self assigned yet.", priceLabel);
  } else {
    const timeLabelsAssigned = getTimeLabelsAssigned(context, payload, config);
    if (timeLabelsAssigned) {
      duration = calculateDurations(timeLabelsAssigned).shift() || null;
    }
  }

  const comment = await generateAssignmentComment(context, payload, duration);
  const metadata = structuredMetadata.create("Assignment", { duration, priceLabel });

  if (!assignees.map((i) => i.login).includes(payload.sender.login)) {
    logger.info("Adding the assignee", { assignee: payload.sender.login });
    await addAssignees(context, issue.number, [payload.sender.login]);
  }

  const isTaskStale = checkTaskStale(taskStaleTimeoutDuration, issue);

  // double check whether the assign message has been already posted or not
  logger.info("Creating an issue comment", { comment });

  const {
    multiplierAmount: multiplierAmount,
    multiplierReason: multiplierReason,
    totalPriceOfTask: totalPriceOfTask,
  } = await getMultiplierInfoToDisplay(context, payload.sender.id, payload.repository.id, issue);
  return [
    assignTableComment({
      multiplierAmount,
      multiplierReason,
      totalPriceOfTask,
      isTaskStale,
      daysElapsedSinceTaskCreation: comment.daysElapsedSinceTaskCreation,
      taskDeadline: comment.deadline,
      registeredWallet: comment.registeredWallet,
    }),
    comment.tips,
    metadata,
  ].join("\n");
}
