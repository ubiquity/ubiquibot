import { Context } from "../../types/context";

import { addLabelToIssue, clearAllPriceLabelsOnIssue } from "../../helpers/issue";
import { createLabel, listLabelsForRepo } from "../../helpers/label";
import { BotConfig } from "../../types/configuration-types";
import { Label } from "../../types/label";
import { GitHubPayload, UserType } from "../../types/payload";
import { labelAccessPermissionsCheck } from "../access/labels-access";
import { setPrice } from "../shared/pricing";
import { handleParentIssue, isParentIssue, sortLabelsByValue } from "./handle-parent-issue";

export async function onLabelChangeSetPricing(context: Context): Promise<void> {
  const config = context.config;
  const logger = context.logger;
  const payload = context.event.payload as GitHubPayload;
  if (!payload.issue) throw context.logger.fatal("Issue is not defined");

  const labels = payload.issue.labels;
  const labelNames = labels.map((i) => i.name);

  if (payload.issue.body && isParentIssue(payload.issue.body)) {
    await handleParentIssue(context, labels);
    return;
  }
  const hasPermission = await labelAccessPermissionsCheck(context);
  if (!hasPermission) {
    if (config.features.publicAccessControl.setLabel === false) {
      throw logger.error("No public access control to set labels");
    }
    throw logger.error("No permission to set labels");
  }

  const { assistivePricing: hasAssistivePricing } = config.features;

  if (!labels) throw logger.error(`No labels to calculate price`);

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
    logger.error("No recognized labels to calculate price");
    await clearAllPriceLabelsOnIssue(context);
    return;
  }

  const minLabels = getMinLabels(recognizedLabels);

  if (!minLabels.time || !minLabels.priority) {
    logger.error("No label to calculate price");
    return;
  }

  if (!hasAssistivePricing) return;

  const targetPriceLabel = setPrice(context, minLabels.time, minLabels.priority);

  if (targetPriceLabel) {
    await handleTargetPriceLabel(context, targetPriceLabel, labelNames);
  } else {
    await clearAllPriceLabelsOnIssue(context);
    logger.info(`Skipping action...`);
  }
}

function getRecognizedLabels(labels: Label[], config: BotConfig) {
  function isRecognizedLabel(label: Label, configLabels: string[]) {
    return (
      (typeof label === "string" || typeof label === "object") &&
      configLabels.some((configLabel) => configLabel === label.name)
    );
  }

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

async function handleTargetPriceLabel(context: Context, targetPriceLabel: string, labelNames: string[]) {
  const _targetPriceLabel = labelNames.find((name) => name.includes("Price") && name.includes(targetPriceLabel));

  if (_targetPriceLabel) {
    await handleExistingPriceLabel(context, targetPriceLabel);
  } else {
    const allLabels = await listLabelsForRepo(context);
    if (allLabels.filter((i) => i.name.includes(targetPriceLabel)).length === 0) {
      await createLabel(context, targetPriceLabel, "price");
    }
    await addPriceLabelToIssue(context, targetPriceLabel);
  }
}

async function handleExistingPriceLabel(context: Context, targetPriceLabel: string) {
  const logger = context.logger;
  let labeledEvents = await getAllLabeledEvents(context);
  if (!labeledEvents) return logger.error("No labeled events found");

  labeledEvents = labeledEvents.filter((event) => event.label?.name.includes("Price"));
  if (!labeledEvents.length) return logger.error("No price labeled events found");

  if (labeledEvents[labeledEvents.length - 1].actor?.type == UserType.User) {
    logger.info(`Skipping... already exists`);
  } else {
    await addPriceLabelToIssue(context, targetPriceLabel);
  }
}

async function addPriceLabelToIssue(context: Context, targetPriceLabel: string) {
  await clearAllPriceLabelsOnIssue(context);
  await addLabelToIssue(context, targetPriceLabel);
}

export async function labelExists(context: Context, name: string): Promise<boolean> {
  const payload = context.event.payload as GitHubPayload;
  try {
    await context.event.octokit.rest.issues.getLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      name,
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function getAllLabeledEvents(context: Context) {
  const events = await getAllIssueEvents(context);
  if (!events) return null;
  return events.filter((event) => event.event === "labeled");
}
async function getAllIssueEvents(context: Context) {
  if (!context.payload.issue) return;

  try {
    const events = await context.octokit.paginate(context.octokit.issues.listEvents, {
      ...context.event.issue(),
      per_page: 100,
    });
    return events;
  } catch (err: unknown) {
    context.logger.fatal("Failed to fetch lists of events", err);
    return [];
  }
}
