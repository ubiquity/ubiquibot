import { Context } from "../../../types/context";
import { GitHubAssignEvent, GitHubIssue, GitHubPayload, GitHubUser } from "../../../types/payload";
import { aggregateAssigneeActivity } from "./aggregate-assignee-activity";
import { assignEventFound } from "./assign-event-found";
import { getActiveAssignees } from "./get-active-assignees";

export async function checkTaskToUnassign(context: Context, assignedIssue: GitHubIssue) {
  const logger = context.logger;
  const payload = context.event.payload as GitHubPayload;
  const {
    timers: { taskDisqualifyDuration, taskFollowUpDuration },
  } = context.config;

  logger.info("Checking for neglected tasks", { issueNumber: assignedIssue.number });

  if (!assignedIssue.assignees) {
    throw logger.error("No assignees found when there are supposed to be assignees.", {
      issueNumber: assignedIssue.number,
    });
  }
  const assignees = assignedIssue.assignees.filter((item): item is GitHubUser => item !== null);
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
    context,
    assigneeLoginsOnly,
    assigneeEvents,
    taskDisqualifyDuration,
    assigneeCommits,
    taskFollowUpDuration
  );

  // assigneeEvents
  const assignEventsOfAssignee: AssignedEvent[] = assigneeEvents.filter(
    (event): event is AssignedEvent => event.event === "assigned" && "assignee" in event && "assigner" in event
  );

  const issueAssignEvents = await getAllIssueAssignEvents(context, assignedIssue.number);
  const latestAssignEvent = issueAssignEvents[0];

  logger.debug("Latest assign event", { latestAssignEvent });

  let disqualifiedAssignees: null | string[] = null;

  if (!latestAssignEvent) {
    return logger.debug("No latest assign event found.", { assignEventsOfAssignee });
  } else {
    disqualifiedAssignees = await assignEventFound({
      latestAssignEvent,
      logger,
      assignees,
      taskDisqualifyDuration,
      disqualifiedAssignees,
      context,
      activeAssigneesInDisqualifyDuration,
      login,
      name,
      number,
      activeAssigneesInFollowUpDuration,
    });
  }
  return logger.ok("Checked task to unassign", {
    issueNumber: assignedIssue.number,
    disqualifiedAssignees,
  });
}

type AssignedEvent = {
  id: number;
  node_id: string;
  url: string;
  actor: GitHubUser;
  event: "assigned";
  commit_id: string;
  commit_url: string;
  created_at: string;
  assignee: GitHubUser;
  assigner: GitHubUser;
  performed_via_github_app: null;
};

async function getAllIssueAssignEvents(context: Context, issueNumber: number): Promise<GitHubAssignEvent[]> {
  const payload = context.payload;

  try {
    const events = (await context.octokit.paginate(
      context.octokit.issues.listEvents,
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: issueNumber,
        per_page: 100,
      },
      (response) => response.data.filter((item) => item.event === "assigned")
    )) as GitHubAssignEvent[];

    return events.sort((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? -1 : 1));
  } catch (err: unknown) {
    context.logger.fatal("Fetching all issue assign events failed!", err);
    return [];
  }
}
