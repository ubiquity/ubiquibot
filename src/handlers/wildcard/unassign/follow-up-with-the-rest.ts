import { Context } from "../../../types/context";
import { checkIfFollowUpAlreadyPosted } from "./check-if-follow-up-already-posted";

export async function followUpWithTheRest(
  context: Context,
  {
    assignees,
    disqualifiedAssignees,
    activeAssigneesInFollowUpDuration,
    login,
    name,
    number,
    taskDisqualifyDuration,
  }: FollowUpWithTheRest
) {
  const followUpAssignees = assignees.filter(
    (assignee) => !disqualifiedAssignees.includes(assignee) && !activeAssigneesInFollowUpDuration.includes(assignee)
  );

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
        context.logger.info("Followed up with idle assignees", { followUpAssignees });
      } catch (e: unknown) {
        context.logger.error("Failed to follow up with idle assignees", e);
      }
    }
  }
}
interface FollowUpWithTheRest {
  assignees: string[];
  disqualifiedAssignees: string[];
  activeAssigneesInFollowUpDuration: string[];
  login: string;
  name: string;
  number: number;
  taskDisqualifyDuration: number;
}
