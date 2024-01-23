import { Logs } from "ubiquibot-logger";
import { Context } from "../../../types/context";
import { GitHubAssignEvent, GitHubUser } from "../../../types/payload";
import { disqualifyIdleAssignees } from "./disqualify-idle-assignees";
import { remindNonEliminatedAssignees } from "./remind-non-eliminated-assignees";

export async function assignEventFound({
  latestAssignEvent,
  logger,
  assignees,
  disqualifiedAssignees,
  context,
  login,
  name,
  number,
  taskDisqualifyDuration,
  activeAssigneesInDisqualifyDuration,
  activeAssigneesInFollowUpDuration,
}: AssignEventFoundParams) {
  const latestAssignEventTime = new Date(latestAssignEvent.created_at).getTime();
  logger.debug("Latest assign event time", { latestAssignEventTime });
  const now = Date.now();
  const assigneesWithinGracePeriod = assignees.filter(() => now - latestAssignEventTime < taskDisqualifyDuration);
  const assigneesOutsideGracePeriod = assignees.filter((assignee) => !assigneesWithinGracePeriod.includes(assignee));
  disqualifiedAssignees = await disqualifyIdleAssignees(context, {
    assignees: assigneesOutsideGracePeriod.map((assignee) => assignee.login),
    activeAssigneesInDisqualifyDuration,
    login,
    name,
    number,
  });

  // DONE: follow up with those who are in `assignees` and not inside of `disqualifiedAssignees` or `activeAssigneesInFollowUpDuration`
  await remindNonEliminatedAssignees(context, {
    assignees: assigneesOutsideGracePeriod.map((assignee) => assignee.login),
    disqualifiedAssignees,
    activeAssigneesInFollowUpDuration,
    login,
    name,
    number,
    taskDisqualifyDuration,
  });
  return disqualifiedAssignees;
}
interface AssignEventFoundParams {
  latestAssignEvent: GitHubAssignEvent;
  logger: Logs;
  assignees: GitHubUser[];
  context: Context;
  login: string;
  name: string;
  number: number;
  disqualifiedAssignees: null | string[];
  taskDisqualifyDuration: number;
  activeAssigneesInDisqualifyDuration: string[];
  activeAssigneesInFollowUpDuration: string[];
}
