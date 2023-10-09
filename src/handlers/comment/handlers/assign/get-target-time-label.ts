import { calculateWeight } from "../../../../helpers";
import { LabelItem } from "../../../../types";

export function getTargetTimeLabel(timeLabelsAssigned: LabelItem[]) {
  const sorted = timeLabelsAssigned.sort((a, b) => calculateWeight(a) - calculateWeight(b));
  return sorted[0];
}
