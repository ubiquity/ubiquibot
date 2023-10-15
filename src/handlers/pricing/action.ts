import Runtime from "../../bindings/bot-runtime";
import { GLOBAL_STRINGS } from "../../configs";
import {
  addLabelToIssue,
  calculateLabelValue,
  clearAllPriceLabelsOnIssue,
  createLabel,
  getAllLabeledEvents,
  getLabel,
} from "../../helpers";
import { Label, UserType } from "../../types";

export async function handleParentIssue(labels: Label[]) {
  const runtime = Runtime.getState();
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));
  if (issuePrices.length) {
    // await addCommentToIssue(GLOBAL_STRINGS.pricingDisabledOnParentIssues, issueNumber);
    await clearAllPriceLabelsOnIssue();
  }
  return runtime.logger.warn(GLOBAL_STRINGS.pricingDisabledOnParentIssues);
}

export function sortLabelsByValue(labels: Label[]) {
  return labels.sort((a, b) => calculateLabelValue(a) - calculateLabelValue(b));
}

export async function handleTargetPriceLabel(
  targetPriceLabel: string,
  labelNames: string[],
  assistivePricing: boolean
) {
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

  const exist = await getLabel(targetPriceLabel);
  console.trace({ exist, assistivePricing });
  if (assistivePricing && !exist) {
    logger.info("Assistive pricing is enabled, creating label...", { targetPriceLabel });
    await createLabel(targetPriceLabel, "price");
  }

  await addLabelToIssue(targetPriceLabel);
}

export function isParentIssue(body: string) {
  const parentPattern = /-\s+\[( |x)\]\s+#\d+/;
  return body.match(parentPattern);
}
