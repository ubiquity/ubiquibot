import { calculateWeight } from "../../../../helpers";
import { LabelFromConfig } from "../../../../types";

export function getTimeLabel(timeLabels: LabelFromConfig[]) {
  const sorted = timeLabels.sort((a, b) => calculateWeight(a) - calculateWeight(b));
  return sorted[0];
}
