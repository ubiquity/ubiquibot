import { Commit } from "../../../types/commit";
import { Context } from "../../../types/context";
import { IssuesListEventsResponseData } from "./unassign";

export function getActiveAssigneesInFollowUpDuration(
  context: Context,
  assignees: string[],
  assigneeEvents: IssuesListEventsResponseData,
  taskFollowUpDuration: number,
  assigneeCommits: Commit[],
  taskDisqualifyDuration: number
) {
  return assignees.filter(() => {
    const currentTime = new Date().getTime();
    const assigneeEventsWithinDuration = assigneeEvents.filter((event) => {
      if (!event?.created_at) {
        context.logger.debug("Event does not have a created_at property", { event });
        return false;
      }
      const eventTime = new Date(event?.created_at).getTime();
      return currentTime - eventTime <= taskFollowUpDuration;
    });
    const assigneeCommitsWithinDuration = assigneeCommits.filter((commit) => {
      const date = commit.commit.author?.date || commit.commit.committer?.date || "";
      return date && new Date().getTime() - new Date(date).getTime() <= taskDisqualifyDuration;
    });
    return assigneeEventsWithinDuration.length === 0 && assigneeCommitsWithinDuration.length === 0;
  });
}
