import { BotConfig } from "../../../../types/configuration-types";
import { Context } from "../../../../types/context";
import { Label } from "../../../../types/label";
import { GitHubPayload } from "../../../../types/payload";

export function getTimeLabelsAssigned(context: Context, payload: GitHubPayload, config: BotConfig) {
  const logger = context.logger;
  const labels = payload.issue?.labels;
  if (!labels?.length) {
    logger.error("Skipping '/start' since no labels are set to calculate the timeline", { labels });
    return;
  }
  const timeLabelsDefined = config.labels.time;
  const timeLabelsAssigned: Label[] = [];
  for (const _label of labels) {
    const _labelType = typeof _label;
    const _labelName = _labelType === "string" ? _label.toString() : _labelType === "object" ? _label.name : "unknown";

    const timeLabel = timeLabelsDefined.find((label) => label === _labelName);
    if (timeLabel) {
      timeLabelsAssigned.push(_label);
    }
  }
  return timeLabelsAssigned;
}
