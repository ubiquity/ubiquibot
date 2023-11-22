import Runtime from "../../../../bindings/bot-runtime";
import { Context, Payload } from "../../../../types";

const options: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  timeZone: "UTC",
  timeZoneName: "short",
};

export async function generateAssignmentComment(context: Context, payload: Payload, duration: number | null = null) {
  const runtime = Runtime.getState();
  const startTime = new Date().getTime();
  let endTime: null | Date = null;
  let deadline: null | string = null;
  if (duration) {
    endTime = new Date(startTime + duration * 1000);
    deadline = endTime.toLocaleString("en-US", options);
  }

  const issueCreationTime = payload.issue?.created_at;
  if (!issueCreationTime) {
    throw context.logger.error("Issue creation time is not defined");
  }

  return {
    daysElapsedSinceTaskCreation: Math.floor((startTime - new Date(issueCreationTime).getTime()) / 1000 / 60 / 60 / 24),
    deadline,
    registeredWallet:
      (await runtime.adapters.supabase.wallet.getAddress(payload.sender.id)) ||
      "Please set your wallet address to use `/wallet 0x0000...0000`",
    tips: `<h6>Tips:</h6>
    <ul>
    <li>Use <code>/wallet 0x0000...0000</code> if you want to update your registered payment wallet address.</li>
    <li>Be sure to open a draft pull request as soon as possible to communicate updates on your progress.</li>
    <li>Be sure to provide timely updates to us when requested, or you will be automatically unassigned from the task.</li>
    <ul>`,
  };
}
