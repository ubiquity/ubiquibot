import { Logs } from "../../../adapters/supabase/helpers/tables/logs";
import { Context } from "../../../types/context";
import { GitHubAssignEvent, GitHubUser } from "../../../types/payload";
import { disqualifyIdleAssignees } from "./disqualify-idle-assignees";
import { followUpWithTheRest } from "./follow-up-with-the-rest";

interface Params {
  latestAssignEvent: GitHubAssignEvent;
  logger: Logs;
  assignees: GitHubUser[];
  taskDisqualifyDuration: number;
  disqualifiedAssignees: null | string[];
  context: Context;
  activeAssigneesInDisqualifyDuration: string[];
  login: string;
  name: string;
  number: number;
  activeAssigneesInFollowUpDuration: string[];
}
export async function assignEventFound({
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
}: Params) {
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
  await followUpWithTheRest(context, {
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
