import Runtime from "../../bindings/bot-runtime";
import { calculateWeight } from "../../helpers";
import { Issue } from "../../types";

//  Checks the issue whether it's an open task for public self assignment
export function taskInfo(issue: Issue): {
  isTask: boolean;
  timeLabel?: string;
  priorityLabel?: string;
  priceLabel?: string;
} {
  const config = Runtime.getState().botConfig;
  const labels = issue.labels;

  const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const isTask = timeLabels.length > 0 && priorityLabels.length > 0;

  const minTimeLabel =
    timeLabels.length > 0
      ? timeLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name
      : undefined;
  const minPriorityLabel =
    priorityLabels.length > 0
      ? priorityLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name
      : undefined;

  const priceLabel = labels.find((label) => label.name.includes("Price"))?.name;

  return {
    isTask,
    timeLabel: minTimeLabel,
    priorityLabel: minPriorityLabel,
    priceLabel,
  };
}
