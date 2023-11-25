import { calculateLabelValue } from "../../helpers";
import { Context } from "../../types/context";
import { Issue } from "../../types/payload";

//  Checks the issue whether it's an open task for public self assignment
export function taskPaymentMetaData(
  context: Context,
  issue: Issue
): {
  eligibleForPayment: boolean;
  timeLabel: string | null;
  priorityLabel: string | null;
  priceLabel: string | null;
} {
  const { labels } = context.config;

  const timeLabels = labels.time.filter((configLabel) => issue.labels.map((i) => i.name).includes(configLabel));
  const priorityLabels = labels.priority.filter((configLabel) => issue.labels.map((i) => i.name).includes(configLabel));

  const isTask = timeLabels.length > 0 && priorityLabels.length > 0;

  const minTimeLabel =
    timeLabels.length > 0
      ? timeLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b))
      : null;

  const minPriorityLabel =
    priorityLabels.length > 0
      ? priorityLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b))
      : null;

  const priceLabel = issue.labels.find((label) => label.name.includes("Price"))?.name || null;

  return {
    eligibleForPayment: isTask,
    timeLabel: minTimeLabel,
    priorityLabel: minPriorityLabel,
    priceLabel,
  };
}
