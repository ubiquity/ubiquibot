import { addAssignees, getAllPullRequests } from "../../../../helpers/issue";
import { calculateDurations } from "../../../../helpers/shared";
import { Context } from "../../../../types/context";
import { GitHubIssue, GitHubPayload, GitHubUser, IssueType } from "../../../../types/payload";
import { isParentIssue } from "../../../pricing/handle-parent-issue";

import structuredMetadata from "../../../shared/structured-metadata";
import { assignTableComment } from "../table";
import { checkTaskStale } from "./check-task-stale";
import { generateAssignmentComment } from "./generate-assignment-comment";
import { getMultiplierInfoToDisplay } from "./get-multiplier-info-to-display";
import { getTimeLabelsAssigned } from "./get-time-labels-assigned";
import Runtime from "../../../../bindings/bot-runtime";

export async function start(context: Context, body: string) {
  const logger = context.logger;
  const config = context.config;
  const payload = context.event.payload as GitHubPayload;
  const issue = payload.issue;
  const {
    miscellaneous: { maxConcurrentTasks },
    timers: { taskStaleTimeoutDuration },
    disabledCommands,
  } = context.config;

  const isStartDisabled = disabledCommands.some((command: string) => command === "start");

  logger.info("Received '/start' command", { sender: payload.sender.login, body });

  if (!issue) {
    throw logger.error(`Skipping '/start' because of no issue instance`);
  }

  if (isStartDisabled) {
    throw logger.error("The `/start` command is disabled for this repository.");
  }

  if (issue.body && isParentIssue(issue.body)) {
    throw logger.error(
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
    throw logger.error("Too many assigned issues, you have reached your max limit", {
      maxConcurrentTasks,
    });
  }

  if (issue.state == IssueType.CLOSED) {
    throw logger.error("Skipping '/start' because the issue is closed.");
  }
  const assignees: GitHubUser[] = (payload.issue?.assignees ?? []).filter(Boolean) as GitHubUser[];

  if (assignees.length !== 0) {
    throw logger.error("Skipping '/start' because the issue is already assigned.");
  }

  // check if wallet is set, if not then throw an error
  const sender = payload.sender;
  const database = Runtime.getState().adapters.supabase;
  const address = database.wallet.getAddress(sender.id);
  if (!address) {
    throw logger.error("Skipping '/start' because the wallet is not set. Please set your wallet first. /wallet 0x0000");
  }

  // ==== preamble checks completed ==== //

  const labels = issue.labels;
  const priceLabel = labels.find((label) => label.name.startsWith("Price: "));

  let duration: number | null = null;
  if (!priceLabel) {
    throw logger.error("No price label is set, so this is not ready to be self assigned yet.", priceLabel);
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

  const { multiplierAmount, multiplierReason, totalPriceOfTask } = await getMultiplierInfoToDisplay(
    context,
    payload.sender.id,
    payload.repository.id,
    issue
  );
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
async function getAvailableOpenedPullRequests(context: Context, username: string) {
  const { reviewDelayTolerance } = context.config.timers;
  if (!reviewDelayTolerance) return [];

  const openedPullRequests = await getOpenedPullRequests(context, username);
  const result = [] as typeof openedPullRequests;

  for (let i = 0; i < openedPullRequests.length; i++) {
    const openedPullRequest = openedPullRequests[i];
    const reviews = await getAllPullRequestReviews(context, openedPullRequest.number);

    if (reviews.length > 0) {
      const approvedReviews = reviews.find((review) => review.state === "APPROVED");
      if (approvedReviews) {
        result.push(openedPullRequest);
      }
    }

    if (
      reviews.length === 0 &&
      (new Date().getTime() - new Date(openedPullRequest.created_at).getTime()) / (1000 * 60 * 60) >=
        reviewDelayTolerance
    ) {
      result.push(openedPullRequest);
    }
  }
  return result;
}

async function getOpenedPullRequests(context: Context, username: string) {
  const prs = await getAllPullRequests(context, "open");
  return prs.filter((pr) => !pr.draft && (pr.user?.login === username || !username));
}
async function getAllPullRequestReviews(
  context: Context,
  pullNumber: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) {
  const payload = context.payload;

  try {
    const reviews = await context.octokit.paginate(context.octokit.rest.pulls.listReviews, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pullNumber,
      per_page: 100,
      mediaType: {
        format,
      },
    });
    return reviews;
  } catch (err: unknown) {
    context.logger.fatal("Fetching all pull request reviews failed!", err);
    return [];
  }
}
async function getAssignedIssues(context: Context, username: string): Promise<GitHubIssue[]> {
  const payload = context.payload;

  try {
    const issues = (await context.octokit.paginate(
      context.octokit.issues.listForRepo,
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        state: IssueType.OPEN,
        per_page: 1000,
      },
      ({ data: issues }) =>
        issues.filter((issue) => !issue.pull_request && issue.assignee && issue.assignee.login === username)
    )) as GitHubIssue[];
    return issues;
  } catch (err: unknown) {
    context.logger.fatal("Fetching assigned issues failed!", err);
    return [];
  }
}
