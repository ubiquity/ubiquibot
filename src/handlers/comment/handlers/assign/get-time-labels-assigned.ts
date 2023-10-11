import Runtime from "../../../../bindings/bot-runtime";
import { BotConfig, LabelFromConfig, Payload } from "../../../../types";

export function getTimeLabelsAssigned(payload: Payload, config: BotConfig): LabelFromConfig[] {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const labels = payload.issue?.labels;
  if (!labels?.length) {
    throw logger.warn("Skipping '/start' since no labels are set to calculate the timeline");
  }
  const timeLabelsDefined = config.price.timeLabels;
  const timeLabelsAssigned: LabelFromConfig[] = [];
  for (const _label of labels) {
    const _labelType = typeof _label;
    const _labelName = _labelType === "string" ? _label.toString() : _labelType === "object" ? _label.name : "unknown";

    const timeLabel = timeLabelsDefined.find((item) => item.name === _labelName);
    if (timeLabel) {
      timeLabelsAssigned.push(timeLabel);
    }
  }
  return timeLabelsAssigned;
}
