import Runtime from "../../../../bindings/bot-runtime";
import { GLOBAL_STRINGS } from "../../../../configs";
import {
  addAssignees,
  calculateDurations,
  getAllIssueComments,
  getAssignedIssues,
  getAvailableOpenedPullRequests,
} from "../../../../helpers";
import { Comment, IssueType, Payload, User } from "../../../../types";
import { isParentIssue } from "../../../pricing";
import { assignTableComment } from "../table";
import { checkTaskStale } from "./check-task-stale";
import { generateAssignmentComment } from "./generate-assignment-comment";
import { getMultiplierInfoToDisplay } from "./get-multiplier-info-to-display";
import { getTimeLabelsAssigned } from "./get-time-labels-assigned";

export async function assign(body: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const config = runtime.botConfig;
  const payload = runtime.eventContext.payload as Payload;
  const issue = payload.issue;

  const staleTask = config.assign.staleTaskTime;
  const startEnabled = config.command.find((command) => command.name === "start");

  logger.info(`Received '/start' command from user: ${payload.sender.login}, body: ${body}`);

  if (!issue) {
    return logger.info(`Skipping '/start' because of no issue instance`);
  }

  if (!startEnabled?.enabled) {
    return logger.warn(GLOBAL_STRINGS.disabledAssigns);
  }

  if (issue.body && isParentIssue(issue.body)) {
    return logger.warn(GLOBAL_STRINGS.startDisabledOnParentIssues);
  }

  const openedPullRequests = await getAvailableOpenedPullRequests(payload.sender.login);
  logger.info(
    `Opened Pull Requests with approved reviews or with no reviews but over 24 hours have passed: ${JSON.stringify(
      openedPullRequests
    )}`
  );

  const assignedIssues = await getAssignedIssues(payload.sender.login);
  logger.info(`Max issue allowed is ${config.assign.maxConcurrentTasks}`);

  // check for max and enforce max
  if (assignedIssues.length - openedPullRequests.length >= config.assign.maxConcurrentTasks) {
    return logger.warn(`Too many assigned issues, you have reached your max of ${config.assign.maxConcurrentTasks}`);
  }

  if (issue.state == IssueType.CLOSED) {
    return logger.warn("Skipping '/start' since the issue is closed");
  }
  const assignees: User[] = payload.issue?.assignees ?? [];

  if (assignees.length !== 0) {
    return logger.warn("Skipping '/start' since the issue is already assigned");
  }

  const timeLabelsAssigned = getTimeLabelsAssigned(payload, config);

  if (timeLabelsAssigned.length == 0) {
    return logger.warn("Skipping '/start' since no time labels are set to calculate the timeline");
  }

  const durations = calculateDurations(timeLabelsAssigned);

  if (durations.length == 0) {
    return logger.warn("Skipping '/start' since no time labels are set to calculate the timeline");
  } else if (durations.length > 1) {
    logger.warn("Using the shortest duration time label", null, true); // post comment
  }

  const duration = durations[0];

  const comment = await generateAssignmentComment(payload, duration);

  if (!assignees.map((i) => i.login).includes(payload.sender.login)) {
    logger.info(`Adding the assignee: ${payload.sender.login}`);
    await addAssignees(issue.number, [payload.sender.login]);
  }

  const isTaskStale = checkTaskStale(staleTask, issue);

  // double check whether the assign message has been already posted or not
  logger.info(`Creating an issue comment: ${comment.timeLimit}`);
  const issueComments = await getAllIssueComments(issue.number);
  const comments = issueComments.sort(
    (a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestComment = comments.length > 0 ? comments[0].body : undefined;
  if (latestComment && comment.timeLimit != latestComment) {
    const {
      multiplierAmount: multiplierAmount,
      multiplierReason: multiplierReason,
      totalPriceOfTask: totalPriceOfTask,
    } = await getMultiplierInfoToDisplay(payload.sender.id, payload.repository.id, issue);
    return (
      assignTableComment({
        multiplierAmount,
        multiplierReason,
        totalPriceOfTask,
        isTaskStale,
        daysElapsedSinceTaskCreation: comment.daysElapsedSinceTaskCreation,
        taskDeadline: comment.timeLimit,
        registeredWallet: comment.registeredWallet,
      }) + comment.tips
    );
  }
  return;
}
