import Runtime from "../../bindings/bot-runtime";
import { addLabelToIssue, clearAllPriceLabelsOnIssue, createLabel, getAllLabeledEvents } from "../../helpers";
import { Label, LabelFromConfig, Payload, UserType } from "../../types";
import { labelAccessPermissionsCheck } from "../access";
import { isParentIssue, handleParentIssue, sortLabelsByValue } from "./action";
import { setPrice } from "../shared/pricing";

export async function onLabelChangeSetPricing() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const config = Runtime.getState().botConfig;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  if (!payload.issue) throw logger.error("Issue is not defined");

  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);

  if (payload.issue.body && isParentIssue(payload.issue.body)) {
    await handleParentIssue(labels);
    return;
  }
  const permission = await labelAccessPermissionsCheck();
  if (!permission) {
    if (config.publicAccessControl.setLabel === false) {
      throw logger.warn("No public access control to set labels");
    }
    throw logger.warn("No permission to set labels");
  }

  const { assistivePricing } = config.mode;

  if (!labels) throw logger.warn(`No labels to calculate price`);

  const isRecognizedLabel = (label: Label, labelConfig: LabelFromConfig[]) =>
    (typeof label === "string" || typeof label === "object") && labelConfig.some((item) => item.name === label.name);

  const recognizedTimeLabels: Label[] = labels.filter((label: Label) =>
    isRecognizedLabel(label, config.price.timeLabels)
  );

  const recognizedPriorityLabels: Label[] = labels.filter((label: Label) =>
    isRecognizedLabel(label, config.price.priorityLabels)
  );

  if (!recognizedTimeLabels.length) {
    logger.warn("No recognized time labels to calculate price");
    await clearAllPriceLabelsOnIssue();
  }
  if (!recognizedPriorityLabels.length) {
    logger.warn("No recognized priority labels to calculate price");
    await clearAllPriceLabelsOnIssue();
  }

  const minTimeLabel = sortLabelsByValue(recognizedTimeLabels).shift();
  const minPriorityLabel = sortLabelsByValue(recognizedPriorityLabels).shift();

  if (!minTimeLabel) {
    logger.warn(`No time label to calculate price`);
    return;
  }
  if (!minPriorityLabel) {
    logger.warn("No priority label to calculate price");
    return;
  }

  const targetPriceLabel = setPrice(minTimeLabel, minPriorityLabel);

  if (targetPriceLabel) {
    await handleTargetPriceLabel(targetPriceLabel, labelNames, assistivePricing);
  } else {
    await clearAllPriceLabelsOnIssue();
    logger.info(`Skipping action...`);
  }
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
  if (!labeledEvents) return logger.warn("No labeled events found");

  labeledEvents = labeledEvents.filter((event) => event.label?.name.includes("Price"));
  if (!labeledEvents.length) return logger.warn("No price labeled events found");

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

  const exists = await getLabel(targetPriceLabel);
  if (assistivePricing && !exists) {
    logger.info("Assistive pricing is enabled, creating label...", { targetPriceLabel });
    await createLabel(targetPriceLabel, "price");
  }

  await addLabelToIssue(targetPriceLabel);
}

export async function getLabel(name: string): Promise<boolean> {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const payload = context.payload as Payload;
  const res = await context.octokit.rest.issues.getLabel({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    name,
  });
  return res.status === 200 ? true : false;
}
