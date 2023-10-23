import { calculateLabelValue } from "../../helpers";
import { Issue, Context } from "../../types";

//  Checks the issue whether it's an open task for public self assignment
export function taskInfo(
  context: Context,
  issue: Issue
): {
  isTask: boolean;
  timeLabel?: string;
  priorityLabel?: string;
  priceLabel?: string;
} {
  const { price } = context.config;
  const labels = issue.labels;

  const timeLabels = price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const isTask = timeLabels.length > 0 && priorityLabels.length > 0;

  const minTimeLabel =
    timeLabels.length > 0
      ? timeLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b)).name
      : undefined;
  const minPriorityLabel =
    priorityLabels.length > 0
      ? priorityLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b)).name
      : undefined;

  const priceLabel = labels.find((label) => label.name.includes("Price"))?.name;

  return {
    isTask,
    timeLabel: minTimeLabel,
    priorityLabel: minPriorityLabel,
    priceLabel,
  };
}
