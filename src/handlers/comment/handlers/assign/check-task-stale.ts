import { Issue } from "../../../../types/payload";

export function checkTaskStale(staleTask: number, issue: Issue) {
  let days: number | undefined;
  let staleToDays: number | undefined;
  let isTaskStale = false;

  if (staleTask !== 0) {
    days = Math.floor((new Date().getTime() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24));
    staleToDays = Math.floor(staleTask / (1000 * 60 * 60 * 24));
    isTaskStale = days >= staleToDays;
  }
  return isTaskStale;
}
