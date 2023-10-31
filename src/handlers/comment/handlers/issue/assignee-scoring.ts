import Decimal from "decimal.js";
import Runtime from "../../../../bindings/bot-runtime";
import { Context } from "../../../../types/context";
import { Issue, User } from "../../../../types/payload";
import { FinalScores } from "./evaluate-comments";
type ContextIssue = { context: Context; issue: Issue };

export async function assigneeScoring({
  context,
  issue,
  proof,
}: ContextIssue & { proof: User[] }): Promise<FinalScores> {
  const assigneeRewards = proof.reduce((accumulator, assignee) => {
    const assigneeScore = new Decimal(0);
    accumulator[assignee.id] = assigneeScore;
    return accumulator;
  }, {} as { [userId: number]: Decimal });

  // get the price label
  const priceLabels = issue.labels.filter((label) => label.name.startsWith("Price: "));
  if (!priceLabels) throw Runtime.getState().logger.warn("Price label is undefined");

  // get the smallest price label
  const priceLabel = priceLabels
    .sort((a, b) => {
      const priceA = parseFloat(a.name.replace("Price: ", ""));
      const priceB = parseFloat(b.name.replace("Price: ", ""));
      return priceA - priceB;
    })[0]
    .name.replace("Price: ", "");

  // get the price
  const price = new Decimal(priceLabel);

  // get the number of assignees
  const numberOfAssignees = proof.length;

  for (const assigneeId in assigneeRewards) {
    // get the assignee multiplier
    const assigneeMultiplier = 1; // TODO: get the assignee multiplier from the database

    // calculate the total
    const total = price.div(numberOfAssignees).times(assigneeMultiplier);
    // return the total
    assigneeRewards[assigneeId] = total;
  }

  return assigneeRewards;
}
