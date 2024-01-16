import { Context } from "../../../types/context";

export async function disqualifyIdleAssignees(
  context: Context,
  { assignees, activeAssigneesInDisqualifyDuration, login, name, number }: DisqualifyIdleAssignees
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
      context.logger.info("Unassigned idle assignees", { idleAssignees });
    } catch (e: unknown) {
      context.logger.error("Failed to unassign idle assignees", e);
    }
  }
  return idleAssignees;
}
interface DisqualifyIdleAssignees {
  assignees: string[];
  activeAssigneesInDisqualifyDuration: string[];
  login: string;
  name: string;
  number: number;
}
