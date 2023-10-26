import Runtime from "../../bindings/bot-runtime";
import { calculateLabelValue } from "../../helpers";
import { Issue } from "../../types";

//  Checks the issue whether it's an open task for public self assignment
export function taskPaymentMetaData(issue: Issue): {
  eligibleForPayment: boolean;
  timeLabel: string | null;
  priorityLabel: string | null;
  priceLabel: string | null;
} {
  const config = Runtime.getState().botConfig;
  const labels = issue.labels;

  const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const isTask = timeLabels.length > 0 && priorityLabels.length > 0;

  const minTimeLabel =
    timeLabels.length > 0
      ? timeLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b)).name
      : null;

  const minPriorityLabel =
    priorityLabels.length > 0
      ? priorityLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b)).name
      : null;

  const priceLabel = labels.find((label) => label.name.includes("Price"))?.name || null;

  return {
    eligibleForPayment: isTask,
    timeLabel: minTimeLabel,
    priorityLabel: minPriorityLabel,
    priceLabel,
  };
}
