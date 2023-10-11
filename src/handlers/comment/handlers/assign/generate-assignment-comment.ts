import Runtime from "../../../../bindings/bot-runtime";
import { Payload } from "../../../../types";
import { getWalletAddress } from "./get-wallet-address";

export async function generateAssignmentComment(payload: Payload, duration: number) {
  const startTime = new Date().getTime();
  const endTime = new Date(startTime + duration * 1000);

  const issueCreationTime = payload.issue?.created_at;
  if (!issueCreationTime) {
    const logger = Runtime.getState().logger;
    throw logger.error("Issue creation time is not defined");
  }

  return {
    daysElapsedSinceTaskCreation: Math.floor((startTime - new Date(issueCreationTime).getTime()) / 1000 / 60 / 60 / 24),
    taskDeadline: endTime.toISOString(),
    registeredWallet:
      (await getWalletAddress(payload.sender.id)) || "Please set your wallet address to use `/wallet 0x0000...0000`",
    timeLimit: endTime.toUTCString(),
    tips: `<h6>Tips:</h6>
    <ul>
    <li>Use <code>/wallet 0x0000...0000</code> if you want to update your registered payment wallet address.</li>
    <li>Be sure to open a draft pull request as soon as possible to communicate updates on your progress.</li>
    <li>Be sure to provide timely updates to us when requested, or you will be automatically unassigned from the task.</li>
    <ul>`,
  };
}
