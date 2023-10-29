import Runtime from "../../bindings/bot-runtime";
import { addLabelToIssue, clearAllPriceLabelsOnIssue, createLabel, getAllLabeledEvents } from "../../helpers";
import { BotConfig, Context, Label, LabelFromConfig, Payload, UserType } from "../../types";
import { labelAccessPermissionsCheck } from "../access";
import { setPrice } from "../shared/pricing";
import { handleParentIssue, isParentIssue, sortLabelsByValue } from "./action";

export async function onLabelChangeSetPricing(context: Context) {
  const runtime = Runtime.getState();
  const config = context.config;
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  if (!payload.issue) throw logger.error("Issue is not defined");

  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);

  if (payload.issue.body && isParentIssue(payload.issue.body)) {
    await handleParentIssue(context, labels);
    return;
  }
  const permission = await labelAccessPermissionsCheck(context);
  if (!permission) {
    if (config.publicAccessControl.setLabel === false) {
      throw logger.warn("No public access control to set labels");
    }
    throw logger.warn("No permission to set labels");
  }

  const { assistivePricing } = config.mode;

  if (!labels) throw logger.warn(`No labels to calculate price`);

  const recognizedLabels = getRecognizedLabels(labels, config);

  if (!recognizedLabels.time.length || !recognizedLabels.priority.length) {
    logger.warn("No recognized labels to calculate price");
    await clearAllPriceLabelsOnIssue(context);
    return;
  }

  const minLabels = getMinLabels(recognizedLabels);

  if (!minLabels.time || !minLabels.priority) {
    logger.warn("No label to calculate price");
    return;
  }

  const targetPriceLabel = setPrice(context, minLabels.time, minLabels.priority);

  if (targetPriceLabel) {
    await handleTargetPriceLabel(context, targetPriceLabel, labelNames, assistivePricing);
  } else {
    await clearAllPriceLabelsOnIssue(context);
    logger.info(`Skipping action...`);
  }
}

function getRecognizedLabels(labels: Label[], config: BotConfig) {
  const isRecognizedLabel = (label: Label, labelConfig: LabelFromConfig[]) =>
    (typeof label === "string" || typeof label === "object") && labelConfig.some((item) => item.name === label.name);

  const recognizedTimeLabels: Label[] = labels.filter((label: Label) =>
    isRecognizedLabel(label, config.price.timeLabels)
  );

  const recognizedPriorityLabels: Label[] = labels.filter((label: Label) =>
    isRecognizedLabel(label, config.price.priorityLabels)
  );

  return { time: recognizedTimeLabels, priority: recognizedPriorityLabels };
}

function getMinLabels(recognizedLabels: { time: Label[]; priority: Label[] }) {
  const minTimeLabel = sortLabelsByValue(recognizedLabels.time).shift();
  const minPriorityLabel = sortLabelsByValue(recognizedLabels.priority).shift();

  return { time: minTimeLabel, priority: minPriorityLabel };
}

async function handleTargetPriceLabel(
  context: Context,
  targetPriceLabel: string,
  labelNames: string[],
  assistivePricing: boolean
) {
  const _targetPriceLabel = labelNames.find((name) => name.includes("Price") && name.includes(targetPriceLabel));

  if (_targetPriceLabel) {
    await handleExistingPriceLabel(context, targetPriceLabel, assistivePricing);
  } else {
    await addPriceLabelToIssue(context, targetPriceLabel, assistivePricing);
  }
}

async function handleExistingPriceLabel(context: Context, targetPriceLabel: string, assistivePricing: boolean) {
  const logger = Runtime.getState().logger;
  let labeledEvents = await getAllLabeledEvents(context);
  if (!labeledEvents) return logger.warn("No labeled events found");

  labeledEvents = labeledEvents.filter((event) => event.label?.name.includes("Price"));
  if (!labeledEvents.length) return logger.warn("No price labeled events found");

  if (labeledEvents[labeledEvents.length - 1].actor?.type == UserType.User) {
    logger.info(`Skipping... already exists`);
  } else {
    await addPriceLabelToIssue(context, targetPriceLabel, assistivePricing);
  }
}

async function addPriceLabelToIssue(context: Context, targetPriceLabel: string, assistivePricing: boolean) {
  const logger = Runtime.getState().logger;
  await clearAllPriceLabelsOnIssue(context);

  const exists = await labelExists(context, targetPriceLabel);
  if (assistivePricing && !exists) {
    logger.info("Assistive pricing is enabled, creating label...", { targetPriceLabel });
    await createLabel(context, targetPriceLabel, "price");
  }

  await addLabelToIssue(context, targetPriceLabel);
}

export async function labelExists(context: Context, name: string): Promise<boolean> {
  const payload = context.event.payload as Payload;
  const res = await context.event.octokit.rest.issues.getLabel({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    name,
  });
  return res.status === 200;
}
