import { RestEndpointMethodTypes } from "@octokit/rest";
import { Logs } from "../../../adapters/supabase";
import Runtime from "../../../bindings/bot-runtime";
import { listAllIssuesAndPullsForRepo } from "../../../helpers";
import { Context, Issue, IssueType, Payload } from "../../../types";

type IssuesListEventsResponseData = RestEndpointMethodTypes["issues"]["listEvents"]["response"]["data"];
type PullsListCommitsResponseData = RestEndpointMethodTypes["pulls"]["listCommits"]["response"]["data"];

export async function checkTasksToUnassign(context: Context) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const issuesAndPullsOpened = await listAllIssuesAndPullsForRepo(context, IssueType.OPEN);
  const assignedIssues = issuesAndPullsOpened.filter((issue) => issue.assignee);

  const tasksToUnassign = await Promise.all(
    assignedIssues.map(async (assignedIssue: Issue) => checkTaskToUnassign(context, assignedIssue))
  );
  logger.ok("Checked all the tasks to unassign", { tasksToUnassign });
}

async function checkTaskToUnassign(context: Context, assignedIssue: Issue) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  const {
    timers: { taskDisqualifyDuration, taskFollowUpDuration },
  } = context.config;

  logger.info("Checking for neglected tasks", { issueNumber: assignedIssue.number });

  if (!assignedIssue.assignees) {
    throw logger.error("No assignees found when there are supposed to be assignees.", {
      issueNumber: assignedIssue.number,
    });
  }

  const assignees = assignedIssue.assignees
    .map((i) => i?.login || null)
    .filter((item): item is string => item !== null);

  const login = payload.repository.owner.login;
  const name = payload.repository.name;
  const number = assignedIssue.number;

  // DONE: check events - e.g. https://api.github.com/repos/ubiquity/ubiquibot/issues/644/events?per_page=100

  const { assigneeEvents, assigneeCommits } = await aggregateAssigneeActivity(context, login, name, number, assignees);

  // Check if the assignee did any "event activity" or commit within the timeout window
  const { activeAssigneesInDisqualifyDuration, activeAssigneesInFollowUpDuration } = getActiveAssignees(
    assignees,
    assigneeEvents,
    taskDisqualifyDuration,
    assigneeCommits,
    taskFollowUpDuration
  );

  const disqualifiedAssignees = await disqualifyIdleAssignees(context, {
    assignees,
    activeAssigneesInDisqualifyDuration,
    login,
    name,
    number,
    logger,
  });

  // DONE: follow up with those who are in `assignees` and not inside of `disqualifiedAssignees` or `activeAssigneesInFollowUpDuration`
  await followUpWithTheRest(context, {
    assignees,
    disqualifiedAssignees,
    activeAssigneesInFollowUpDuration,
    login,
    name,
    number,
    logger,
    taskDisqualifyDuration,
  });

  return logger.ok("Checked task to unassign", { issueNumber: assignedIssue.number, disqualifiedAssignees });
}

async function followUpWithTheRest(
  context: Context,
  {
    assignees,
    disqualifiedAssignees,
    activeAssigneesInFollowUpDuration,
    login,
    name,
    number,
    logger,
    taskDisqualifyDuration,
  }: FollowUpWithTheRest
) {
  const followUpAssignees = assignees.filter((assignee) => {
    return !disqualifiedAssignees.includes(assignee) && !activeAssigneesInFollowUpDuration.includes(assignee);
  });

  if (followUpAssignees.length > 0) {
    const followUpMessage = `@${followUpAssignees.join(
      ", @"
    )}, this task has been idle for a while. Please provide an update.`;

    // Fetch recent comments
    const hasRecentFollowUp = await checkIfFollowUpAlreadyPosted(
      context,
      login,
      name,
      number,
      followUpMessage,
      taskDisqualifyDuration
    );

    if (!hasRecentFollowUp) {
      try {
        await context.event.octokit.rest.issues.createComment({
          owner: login,
          repo: name,
          issue_number: number,
          body: followUpMessage,
        });
        logger.info("Followed up with idle assignees", { followUpAssignees });
      } catch (e: unknown) {
        logger.error("Failed to follow up with idle assignees", e);
      }
    }
  }
}

async function checkIfFollowUpAlreadyPosted(
  context: Context,
  login: string,
  name: string,
  number: number,
  followUpMessage: string,
  disqualificationPeriod: number
) {
  const comments = await context.event.octokit.rest.issues.listComments({
    owner: login,
    repo: name,
    issue_number: number,
  });

  // Get the current time
  const now = new Date().getTime();

  // Check if a similar comment has already been posted within the disqualification period
  const hasRecentFollowUp = comments.data.some(
    (comment) =>
      comment.body === followUpMessage &&
      comment?.user?.type === "Bot" &&
      now - new Date(comment.created_at).getTime() <= disqualificationPeriod
  );
  return hasRecentFollowUp;
}

async function aggregateAssigneeActivity(
  context: Context,
  login: string,
  name: string,
  number: number,
  assignees: string[]
) {
  const allEvents = await getAllEvents(context, login, name, number);
  const assigneeEvents = allEvents.filter((event) => assignees.includes(event.actor.login)); // Filter all events by assignees

  // DONE: check commits - e.g. https://api.github.com/repos/ubiquity/ubiquibot/pulls/644/commits?per_page=100
  const allCommits = await getAllCommits(context, login, name, number);

  // Filter all commits by assignees
  const assigneeCommits = allCommits.filter((commit) => {
    const name = commit.author?.login || commit.commit.committer?.name;
    if (!name) {
      return false;
    }
    assignees.includes(name);
  });
  return { assigneeEvents, assigneeCommits };
}

async function disqualifyIdleAssignees(
  context: Context,
  { assignees, activeAssigneesInDisqualifyDuration, login, name, number, logger }: DisqualifyIdleAssignees
) {
  const idleAssignees = assignees.filter((assignee) => !activeAssigneesInDisqualifyDuration.includes(assignee));

  if (idleAssignees.length > 0) {
    try {
      await context.event.octokit.rest.issues.removeAssignees({
        owner: login,
        repo: name,
        issue_number: number,
        assignees: idleAssignees,
      });
      logger.info("Unassigned idle assignees", { idleAssignees });
    } catch (e: unknown) {
      logger.error("Failed to unassign idle assignees", e);
    }
  }
  return idleAssignees;
}

function getActiveAssignees(
  assignees: string[],
  assigneeEvents: IssuesListEventsResponseData,
  taskDisqualifyDuration: number,
  assigneeCommits: PullsListCommitsResponseData,
  taskFollowUpDuration: number
) {
  const activeAssigneesInDisqualifyDuration = getActiveAssigneesInDisqualifyDuration(
    assignees,
    assigneeEvents,
    taskDisqualifyDuration,
    assigneeCommits
  );

  const activeAssigneesInFollowUpDuration = getActiveAssigneesInFollowUpDuration(
    assignees,
    assigneeEvents,
    taskFollowUpDuration,
    assigneeCommits,
    taskDisqualifyDuration
  );

  return {
    activeAssigneesInDisqualifyDuration,
    activeAssigneesInFollowUpDuration,
  };
}

function getActiveAssigneesInFollowUpDuration(
  assignees: string[],
  assigneeEvents: IssuesListEventsResponseData,
  taskFollowUpDuration: number,
  assigneeCommits: PullsListCommitsResponseData,
  taskDisqualifyDuration: number
) {
  return assignees.filter(() => {
    const assigneeEventsWithinDuration = assigneeEvents.filter(
      (event) => new Date().getTime() - new Date(event.created_at).getTime() <= taskFollowUpDuration
    );
    const assigneeCommitsWithinDuration = assigneeCommits.filter((commit) => {
      const date = commit.commit.author?.date || commit.commit.committer?.date || "";
      return date && new Date().getTime() - new Date(date).getTime() <= taskDisqualifyDuration;
    });
    return assigneeEventsWithinDuration.length === 0 && assigneeCommitsWithinDuration.length === 0;
  });
}

function getActiveAssigneesInDisqualifyDuration(
  assignees: string[],
  assigneeEvents: IssuesListEventsResponseData,
  taskDisqualifyDuration: number,
  assigneeCommits: PullsListCommitsResponseData
) {
  return assignees.filter(() => {
    const assigneeEventsWithinDuration = assigneeEvents.filter(
      (event) => new Date().getTime() - new Date(event.created_at).getTime() <= taskDisqualifyDuration
    );

    assigneeCommits[0].commit.committer?.date;
    const assigneeCommitsWithinDuration = assigneeCommits.filter((commit) => {
      const date = commit.commit.author?.date || commit.commit.committer?.date || "";
      return date && new Date().getTime() - new Date(date).getTime() <= taskDisqualifyDuration;
    });
    return assigneeEventsWithinDuration.length === 0 && assigneeCommitsWithinDuration.length === 0;
  });
}

async function getAllEvents(context: Context, owner: string, repo: string, issue_number: number) {
  let allEvents: IssuesListEventsResponseData = [];
  let page = 1;
  let events = await context.event.octokit.issues.listEvents({
    owner,
    repo,
    issue_number,
    per_page: 100,
    page: page,
  });

  while (events.data.length > 0) {
    allEvents = allEvents.concat(events.data.filter(isCorrectType) as IssuesListEventsResponseData);

    page++;
    events = await context.event.octokit.issues.listEvents({
      owner,
      repo,
      issue_number,
      per_page: 100,
      page: page,
    });
  }
  return allEvents;
}

async function getAllCommits(context: Context, owner: string, repo: string, pull_number: number) {
  let allCommits: PullsListCommitsResponseData = [];
  let commitPage = 1;
  let hasMoreCommits = true;

  while (hasMoreCommits) {
    const commits = await context.event.octokit.pulls.listCommits({
      owner,
      repo,
      pull_number,
      per_page: 100,
      page: commitPage,
    });

    if (commits.data.length === 0) {
      hasMoreCommits = false;
    } else {
      allCommits = allCommits.concat(commits.data);
      commitPage++;
    }
  }
  return allCommits;
}

function isCorrectType(event: any): event is IssuesListEventsResponseData {
  return event && typeof event.id === "number";
}

interface DisqualifyIdleAssignees {
  assignees: string[];
  activeAssigneesInDisqualifyDuration: string[];
  login: string;
  name: string;
  number: number;
  logger: Logs;
}

interface FollowUpWithTheRest {
  assignees: string[];
  disqualifiedAssignees: string[];
  activeAssigneesInFollowUpDuration: string[];
  login: string;
  name: string;
  number: number;
  logger: Logs;
  taskDisqualifyDuration: number;
}
