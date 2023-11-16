import Runtime from "../../bindings/bot-runtime";
import { addLabelToIssue, clearAllPriceLabelsOnIssue, createLabel, getAllLabeledEvents } from "../../helpers";
import { BotConfig, Context, Label, Payload, UserType } from "../../types";
import { labelAccessPermissionsCheck } from "../access";
import { setPrice } from "../shared/pricing";
import { handleParentIssue, isParentIssue, sortLabelsByValue } from "./action";

export async function onLabelChangeSetPricing(context: Context): Promise<void> {
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
    if (config.features.publicAccessControl.setLabel === false) {
      throw logger.warn("No public access control to set labels");
    }
    throw logger.warn("No permission to set labels");
  }

  const { assistivePricing } = config.features;

  if (!labels) throw logger.warn(`No labels to calculate price`);

  // here we should make an exception if it was a price label that was just set to just skip this action
  const isPayloadToSetPrice = payload.label?.name.includes("Price: ");
  if (isPayloadToSetPrice) {
    logger.info("This is setting the price label directly so skipping the rest of the action.");

    // make sure to clear all other price labels except for the smallest price label.

    const priceLabels = labels.filter((label) => label.name.includes("Price: "));
    const sortedPriceLabels = sortLabelsByValue(priceLabels);
    const smallestPriceLabel = sortedPriceLabels.shift();
    const smallestPriceLabelName = smallestPriceLabel?.name;
    if (smallestPriceLabelName) {
      for (const label of sortedPriceLabels) {
        await context.event.octokit.issues.removeLabel({
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          issue_number: payload.issue.number,
          name: label.name,
        });
      }
    }

    return;
  }

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
  const isRecognizedLabel = (label: Label, configLabels: string[]) =>
    (typeof label === "string" || typeof label === "object") &&
    configLabels.some((configLabel) => configLabel === label.name);

  const recognizedTimeLabels: Label[] = labels.filter((label: Label) => isRecognizedLabel(label, config.labels.time));

  const recognizedPriorityLabels: Label[] = labels.filter((label: Label) =>
    isRecognizedLabel(label, config.labels.priority)
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
