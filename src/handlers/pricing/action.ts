import Runtime from "../../bindings/bot-runtime";
import { calculateLabelValue, clearAllPriceLabelsOnIssue } from "../../helpers";
import { Label, Context } from "../../types";

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

export function isParentIssue(body: string) {
  const parentPattern = /-\s+\[( |x)\]\s+#\d+/;
  return body.match(parentPattern);
}
