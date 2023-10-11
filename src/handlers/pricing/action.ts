import Runtime from "../../bindings/bot-runtime";
import { GLOBAL_STRINGS } from "../../configs";
import {
  addCommentToIssue,
  addLabelToIssue,
  calculateLabelValue,
  clearAllPriceLabelsOnIssue,
  createLabel,
  getAllLabeledEvents,
  getLabel,
} from "../../helpers";
import { Label, Payload, UserType } from "../../types";
import { handleLabelsAccess } from "../access";
import { setPrice } from "../shared";

export async function pricingLabel(): Promise<void> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const config = Runtime.getState().botConfig;
  const logger = runtime.logger;
  const payload = context.payload as Payload;

  if (!payload.issue) throw logger.error("Issue is not defined");

  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);

  if (payload.issue.body && isParentIssue(payload.issue.body)) {
    await handleParentIssue(labels, payload.issue.number);
    return;
  }

  if (!(await handleLabelsAccess()) && config.publicAccessControl.setLabel) {
    return;
  }

  const { assistivePricing } = config.mode;

  if (!labels) {
    throw logger.warn(`No labels to calculate price`);
  }

  const recognizedTimeLabels: Label[] = labels.filter((label: Label) =>
    typeof label === "string" || typeof label === "object"
      ? config.price.timeLabels.some((item) => item.name === label.name)
      : false
  );

  const recognizedPriorityLabels: Label[] = labels.filter((label: Label) =>
    typeof label === "string" || typeof label === "object"
      ? config.price.priorityLabels.some((item) => item.name === label.name)
      : false
  );

  if (!recognizedTimeLabels.length) {
    await clearAllPriceLabelsOnIssue();
    throw logger.warn("No recognized time labels to calculate price", null, true);
  }
  if (!recognizedPriorityLabels.length) {
    await clearAllPriceLabelsOnIssue();
    throw logger.warn("No recognized priority labels to calculate price", null, true);
  }

  const minTimeLabel = getMinLabel(recognizedTimeLabels);
  const minPriorityLabel = getMinLabel(recognizedPriorityLabels);

  if (!minTimeLabel || !minPriorityLabel) throw logger.warn("Time or priority label is not defined");

  const targetPriceLabel = setPrice(minTimeLabel, minPriorityLabel);

  if (targetPriceLabel) {
    await handleTargetPriceLabel(targetPriceLabel, labelNames, assistivePricing);
  } else {
    await clearAllPriceLabelsOnIssue();
    logger.info(`Skipping action...`);
  }
}

async function handleParentIssue(labels: Label[], issueNumber: number) {
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));
  if (issuePrices.length) {
    await addCommentToIssue(GLOBAL_STRINGS.pricingDisabledOnParentIssues, issueNumber);
    await clearAllPriceLabelsOnIssue();
  }
}

function getMinLabel(labels: Label[]) {
  return labels.reduce((a, b) => (calculateLabelValue(a) < calculateLabelValue(b) ? a : b)).name;
}

async function handleTargetPriceLabel(targetPriceLabel: string, labelNames: string[], assistivePricing: boolean) {
  const _targetPriceLabel = labelNames.find((name) => name.includes("Price") && name.includes(targetPriceLabel));

  if (_targetPriceLabel) {
    await handleExistingPriceLabel(targetPriceLabel, assistivePricing);
  } else {
    await handleNewPriceLabel(targetPriceLabel, assistivePricing);
  }
}

async function handleExistingPriceLabel(targetPriceLabel: string, assistivePricing: boolean) {
  const logger = Runtime.getState().logger;
  let labeledEvents = await getAllLabeledEvents();
  if (!labeledEvents) return;

  labeledEvents = labeledEvents.filter((event) => event.label?.name.includes("Price"));
  if (!labeledEvents.length) return;

  if (labeledEvents[labeledEvents.length - 1].actor?.type == UserType.User) {
    logger.info(`Skipping... already exists`);
  } else {
    await addPriceLabelToIssue(targetPriceLabel, assistivePricing);
  }
}

async function handleNewPriceLabel(targetPriceLabel: string, assistivePricing: boolean) {
  await addPriceLabelToIssue(targetPriceLabel, assistivePricing);
}

async function addPriceLabelToIssue(targetPriceLabel: string, assistivePricing: boolean) {
  const logger = Runtime.getState().logger;
  await clearAllPriceLabelsOnIssue();

  const exist = await getLabel(targetPriceLabel);

  if (assistivePricing && !exist) {
    logger.info(`${targetPriceLabel} doesn't exist on the repo, creating...`);
    await createLabel(targetPriceLabel, "price");
  }

  await addLabelToIssue(targetPriceLabel);
}

export function isParentIssue(body: string) {
  const parentPattern = /-\s+\[( |x)\]\s+#\d+/;
  return body.match(parentPattern);
}
