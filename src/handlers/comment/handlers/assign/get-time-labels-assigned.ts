import Runtime from "../../../../bindings/bot-runtime";
import { BotConfig, Label, Payload } from "../../../../types";

export function getTimeLabelsAssigned(payload: Payload, config: BotConfig) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const labels = payload.issue?.labels;
  if (!labels?.length) {
    logger.warn("Skipping '/start' since no labels are set to calculate the timeline", { labels });
    return;
  }
  const timeLabelsDefined = config.price.timeLabels;
  const timeLabelsAssigned: Label[] = [];
  for (const _label of labels) {
    const _labelType = typeof _label;
    const _labelName = _labelType === "string" ? _label.toString() : _labelType === "object" ? _label.name : "unknown";

    const timeLabel = timeLabelsDefined.find((item) => item.name === _labelName);
    if (timeLabel) {
      timeLabelsAssigned.push(_label);
    }
  }
  return timeLabelsAssigned;
}
