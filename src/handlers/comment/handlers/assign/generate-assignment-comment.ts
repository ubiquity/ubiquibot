import Runtime from "../../../../bindings/bot-runtime";
import { Payload } from "../../../../types";

export async function generateAssignmentComment(payload: Payload, duration: number) {
  const runtime = Runtime.getState();
  const startTime = new Date().getTime();
  const endTime = new Date(startTime + duration * 1000);

  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: "UTC",
    timeZoneName: "short",
  };
  const deadline = endTime.toLocaleString("en-US", options);

  const issueCreationTime = payload.issue?.created_at;
  if (!issueCreationTime) {
    const logger = Runtime.getState().logger;
    throw logger.error("Issue creation time is not defined");
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
