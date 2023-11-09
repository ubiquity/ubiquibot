export function assignTableComment({
  taskDeadline,
  registeredWallet,
  multiplierAmount,
  multiplierReason,
  totalPriceOfTask,
  isTaskStale,
  daysElapsedSinceTaskCreation,
}: AssignTableCommentParams) {
  let taskStaleWarning = ``;
  if (isTaskStale) {
    taskStaleWarning = `<tr><td>Warning!</td> <td>This task was created over ${daysElapsedSinceTaskCreation} days ago. Please confirm that this issue specification is accurate before starting.</td></tr>`;
  }
  let deadlineWarning = ``;
  if (taskDeadline) {
    deadlineWarning = `<tr><td>Deadline</td><td>${taskDeadline}</td></tr>`;
  }

  return `
<code>
<table>
${taskStaleWarning}
${deadlineWarning}
<tr>
<td>Registered Wallet</td>
<td>${registeredWallet}</td>
</tr>
${multiplierAmount ? `<tr><td>Payment Multiplier</td><td>${multiplierAmount}</td></tr>` : ``}
${multiplierReason ? `<tr><td>Multiplier Reason</td><td>${multiplierReason}</td></tr>` : ``}
${totalPriceOfTask ? `<tr><td>Total Price</td><td>${totalPriceOfTask}</td></tr>` : ``}
</table></code>`;
}

interface AssignTableCommentParams {
  taskDeadline: string | null;
  registeredWallet: string;
  multiplierAmount: number | null;
  multiplierReason: string | null;
  totalPriceOfTask: string | null;
  isTaskStale: boolean;
  daysElapsedSinceTaskCreation: number;
}
