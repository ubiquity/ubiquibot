import Runtime from "../../bindings/bot-runtime";
import {
  addLabelToIssue,
  calculateLabelValue,
  clearAllPriceLabelsOnIssue,
  createLabel,
  getAllLabeledEvents,
  getLabel,
} from "../../helpers";
import { Label, UserType, Context } from "../../types";

export async function handleParentIssue(context: Context, labels: Label[]) {
  const runtime = Runtime.getState();
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));
  if (issuePrices.length) {
    await clearAllPriceLabelsOnIssue(context);
  }
  throw runtime.logger.warn("Pricing is disabled on parent issues.");
}

export function sortLabelsByValue(labels: Label[]) {
  return labels.sort((a, b) => calculateLabelValue(a) - calculateLabelValue(b));
}

export async function handleTargetPriceLabel(
  context: Context,
  targetPriceLabel: string,
  labelNames: string[],
  assistivePricing: boolean
) {
  const _targetPriceLabel = labelNames.find((name) => name.includes("Price") && name.includes(targetPriceLabel));

  if (_targetPriceLabel) {
    await handleExistingPriceLabel(context, targetPriceLabel, assistivePricing);
  } else {
    await handleNewPriceLabel(context, targetPriceLabel, assistivePricing);
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

async function handleNewPriceLabel(context: Context, targetPriceLabel: string, assistivePricing: boolean) {
  await addPriceLabelToIssue(context, targetPriceLabel, assistivePricing);
}

async function addPriceLabelToIssue(context: Context, targetPriceLabel: string, assistivePricing: boolean) {
  const logger = Runtime.getState().logger;
  await clearAllPriceLabelsOnIssue(context);

  const exist = await getLabel(context, targetPriceLabel);
  console.trace({ exist, assistivePricing });
  if (assistivePricing && !exist) {
    logger.info("Assistive pricing is enabled, creating label...", { targetPriceLabel });
    await createLabel(context, targetPriceLabel, "price");
  }

  await addLabelToIssue(context, targetPriceLabel);
}

export function isParentIssue(body: string) {
  const parentPattern = /-\s+\[( |x)\]\s+#\d+/;
  return body.match(parentPattern);
}
