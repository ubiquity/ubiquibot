import { Payload } from "../../../../types";
import Runtime from "../../../../bindings/bot-runtime";
import { addLabelToIssue, calculateLabelValue, createLabel, getLabel } from "../../../../helpers";
import { setPrice } from "../../../shared";

export async function issueCreatedCallback() {
  // Callback for issues created - Processor
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const config = runtime.botConfig;
  const payload = runtime.eventContext.payload as Payload;
  const issue = payload.issue;
  if (!issue) {
    return logger.error("No issue found in payload", payload);
  }
  const labels = issue.labels;

  const { assistivePricing } = config.mode;

  if (!assistivePricing) {
    return logger.info("Skipping adding label to issue because assistive pricing is disabled.");
  }

  // try {
  const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const minTimeLabel =
    timeLabels.length > 0
      ? timeLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b)).name
      : config.price.defaultLabels[0];
  const minPriorityLabel =
    priorityLabels.length > 0
      ? priorityLabels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b)).name
      : config.price.defaultLabels[1];
  if (!timeLabels.length) await addLabelToIssue(minTimeLabel);
  if (!priorityLabels.length) await addLabelToIssue(minPriorityLabel);

  const targetPriceLabel = setPrice(minTimeLabel, minPriorityLabel);
  if (targetPriceLabel && !labels.map((i) => i.name).includes(targetPriceLabel)) {
    const exist = await getLabel(targetPriceLabel);
    if (!exist) await createLabel(targetPriceLabel, "price");
    await addLabelToIssue(targetPriceLabel);
  }

  return runtime.logger.error(`Error adding label to issue`);
}
