import { IssuesListEventsResponseData } from "./unassign";

export function isCorrectType(event: IssuesListEventsResponseData[0]) {
  return event && typeof event.id === "number";
}
