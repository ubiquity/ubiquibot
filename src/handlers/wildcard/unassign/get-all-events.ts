import { Context } from "../../../types/context";
import { isCorrectType } from "./is-correct-type";
import { IssuesListEventsResponseData } from "./unassign";

export async function getAllEvents({ context, owner, repo, issueNumber }: GetAllEvents) {
  try {
    const events = (await context.octokit.paginate(
      context.octokit.rest.issues.listEvents,
      {
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 100,
      },
      (response: { data: any[] }) =>
        response.data.filter((event) => isCorrectType(event as IssuesListEventsResponseData[0]))
    )) as IssuesListEventsResponseData;
    return events;
  } catch (err: unknown) {
    context.logger.error("Failed to fetch lists of events", err);
    return [];
  }
}
interface GetAllEvents {
  context: Context;
  owner: string;
  repo: string;
  issueNumber: number;
}
