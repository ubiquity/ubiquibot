import { RestEndpointMethodTypes } from "@octokit/rest";
import { Logs } from "../../../adapters/supabase";
import Runtime from "../../../bindings/bot-runtime";
import { listAllIssuesAndPullsForRepo } from "../../../helpers";
import { getLinkedPullRequests } from "../../../helpers/parser";
import { Commit, Context, Issue, IssueType, Payload, User } from "../../../types";

type IssuesListEventsResponseData = RestEndpointMethodTypes["issues"]["listEvents"]["response"]["data"];
// type Commit[] = Commit[]; // RestEndpointMethodTypes["pulls"]["listCommits"]["response"]["data"];

export async function checkTasksToUnassign(context: Context) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const issuesAndPullsOpened = await listAllIssuesAndPullsForRepo(context, IssueType.OPEN);
  const assignedIssues = issuesAndPullsOpened.filter((issue) => issue.assignee);

  const tasksToUnassign = await Promise.all(
    assignedIssues.map(async (assignedIssue: Issue) => checkTaskToUnassign(context, assignedIssue))
  );
  logger.ok("Checked all the tasks to unassign", {
    tasksToUnassign: tasksToUnassign.map((tasksToUnassign) => tasksToUnassign.metadata),
  });
}

async function checkTaskToUnassign(context: Context, assignedIssue: Issue) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  const unassign = context.config.unassign;
  const { taskDisqualifyDuration, taskFollowUpDuration } = unassign;

  logger.info("Checking for neglected tasks", { issueNumber: assignedIssue.number });

  if (!assignedIssue.assignees) {
    throw logger.error("No assignees found when there are supposed to be assignees.", {
      issueNumber: assignedIssue.number,
    });
  }
  const assignees = assignedIssue.assignees.filter((item): item is User => item !== null);

  const assigneeLoginsOnly = assignees.map((assignee) => assignee.login);

  const login = payload.repository.owner.login;
  const name = payload.repository.name;
  const number = assignedIssue.number;

  // DONE: check events - e.g. https://api.github.com/repos/ubiquity/ubiquibot/issues/644/events?per_page=100

  const { assigneeEvents, assigneeCommits } = await aggregateAssigneeActivity({
    context,
    login,
    name,
    number,
    assignees: assigneeLoginsOnly,
  });

  // Check if the assignee did any "event activity" or commit within the timeout window
  const { activeAssigneesInDisqualifyDuration, activeAssigneesInFollowUpDuration } = getActiveAssignees(
    assigneeLoginsOnly,
    assigneeEvents,
    taskDisqualifyDuration,
    assigneeCommits,
    taskFollowUpDuration
  );

  // assigneeEvents

  const assignEventsOfAssignee = assigneeEvents.filter((event) => {
    // check if the event is an assign event and if the assignee is the same as the assignee we're checking
    if (event.event == "assigned") {
      const assignedEvent = event as AssignedEventExample;
      return assignedEvent.assignee.login === login;
    }
  });
  // get latest assign event by checking created_at
  const latestAssignEvent = assignEventsOfAssignee.reduce((latestEvent, currentEvent) => {
    const latestEventTime = new Date(latestEvent.created_at).getTime();
    const currentEventTime = new Date(currentEvent.created_at).getTime();
    return currentEventTime > latestEventTime ? currentEvent : latestEvent;
  }, assignEventsOfAssignee[0]);

  const latestAssignEventTime = new Date(latestAssignEvent.created_at).getTime();
  const now = Date.now();

  const assigneesWithinGracePeriod = assignees.filter((assignee) => {
    return now - latestAssignEventTime < taskDisqualifyDuration;
  });

  const assigneesOutsideGracePeriod = assignees.filter((assignee) => !assigneesWithinGracePeriod.includes(assignee));

  const disqualifiedAssignees = await disqualifyIdleAssignees(context, {
    assignees: assigneesOutsideGracePeriod.map((assignee) => assignee.login),
    activeAssigneesInDisqualifyDuration,
    login,
    name,
    number,
    logger,
  });

  // DONE: follow up with those who are in `assignees` and not inside of `disqualifiedAssignees` or `activeAssigneesInFollowUpDuration`
  await followUpWithTheRest(context, {
    assignees: assigneesOutsideGracePeriod.map((assignee) => assignee.login),
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

async function aggregateAssigneeActivity({ context, login, name, number, assignees }: AggregateAssigneeActivity) {
  const allEvents = await getAllEvents({ context, owner: login, repo: name, issueNumber: number });
  const assigneeEvents = allEvents.filter((event) => assignees.includes(event.actor.login)); // Filter all events by assignees

  // check the linked pull request and then check that pull request's commits

  const linkedPullRequests = await getLinkedPullRequests({ owner: login, repository: name, issue: number });

  const allCommits = [] as Commit[];
  for (const pullRequest of linkedPullRequests) {
    try {
      const commits = await getAllCommitsFromPullRequest({
        context,
        owner: login,
        repo: name,
        pullNumber: pullRequest.number,
      });
      allCommits.push(...commits);
    } catch (error) {
      console.trace({ error });
      // return [];
    }
  }

  // DONE: check commits - e.g. https://api.github.com/repos/ubiquity/ubiquibot/pulls/644/commits?per_page=100

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
  assigneeCommits: Commit[],
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
  assigneeCommits: Commit[],
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
  assigneeCommits: Commit[]
) {
  return assignees.filter(() => {
    const assigneeEventsWithinDuration = assigneeEvents.filter(
      (event) => new Date().getTime() - new Date(event.created_at).getTime() <= taskDisqualifyDuration
    );

    const assigneeCommitsWithinDuration = assigneeCommits.filter((commit) => {
      const date = commit.commit.author?.date || commit.commit.committer?.date || "";
      return date && new Date().getTime() - new Date(date).getTime() <= taskDisqualifyDuration;
    });
    return assigneeEventsWithinDuration.length === 0 && assigneeCommitsWithinDuration.length === 0;
  });
}

async function getAllEvents({ context, owner, repo, issueNumber }: GetAllEvents) {
  let allEvents: IssuesListEventsResponseData = [];
  let page = 1;
  let events = await context.event.octokit.issues.listEvents({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
    page: page,
  });

  while (events.data.length > 0) {
    allEvents = allEvents.concat(events.data.filter(isCorrectType) as IssuesListEventsResponseData);

    events = await context.event.octokit.issues.listEvents({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
      page: ++page,
    });
  }
  return allEvents;
}

async function getAllCommitsFromPullRequest({ context, owner, repo, pullNumber }: GetAllCommits) {
  let allCommits = [] as Commit[];
  let commitPage = 1;
  let hasMoreCommits = true;

  while (hasMoreCommits) {
    const commits = await context.event.octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page: commitPage,
    });

    if (commits.data.length === 0) {
      hasMoreCommits = false;
    } else {
      allCommits = allCommits.concat(commits.data as Commit[]);
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

interface AggregateAssigneeActivity {
  context: Context;
  login: string;
  name: string;
  number: number;
  assignees: string[];
}
interface GetAllEvents {
  context: Context;
  owner: string;
  repo: string;
  issueNumber: number;
}
interface GetAllCommits {
  context: Context;
  owner: string;
  repo: string;
  pullNumber: number;
}
interface AssignedEventExample {
  id: 10841266730;
  node_id: "AE_lADOJE8L5s51pPgazwAAAAKGMJoq";
  url: "https://api.github.com/repos/pavlovcik/ubiquibot/issues/events/10841266730";
  actor: User;
  event: "assigned";
  commit_id: null;
  commit_url: null;
  created_at: "2023-11-02T09:13:58Z";
  assignee: User;
  assigner: User;
  performed_via_github_app: null;
}
