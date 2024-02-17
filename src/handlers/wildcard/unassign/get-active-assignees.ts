import { Commit } from "../../../types/commit";
import { Context } from "../../../types/context";
import { getActiveAssigneesInDisqualifyDuration } from "./get-active-assignees-in-disqualify-duration";
import { getActiveAssigneesInFollowUpDuration } from "./get-active-assignees-in-follow-up-duration";
import { IssuesListEventsResponseData } from "./unassign";

export function getActiveAssignees(
  context: Context,
  assignees: string[],
  assigneeEvents: IssuesListEventsResponseData,
  taskDisqualifyDuration: number,
  assigneeCommits: Commit[],
  taskFollowUpDuration: number
) {
  const activeAssigneesInDisqualifyDuration = getActiveAssigneesInDisqualifyDuration(
    context,
    assignees,
    assigneeEvents,
    taskDisqualifyDuration,
    assigneeCommits
  );

  const activeAssigneesInFollowUpDuration = getActiveAssigneesInFollowUpDuration(
    context,
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
