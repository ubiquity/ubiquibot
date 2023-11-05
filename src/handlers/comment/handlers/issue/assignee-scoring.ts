import Decimal from "decimal.js";
import Runtime from "../../../../bindings/bot-runtime";
import { Issue, User } from "../../../../types/payload";
import { ScoresByUser, ScoreDetails } from "./issue-shared-types";

export async function assigneeScoring({ issue, source }: { issue: Issue; source: User[] }): Promise<ScoresByUser[]> {
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
    .name.match(/\d+(\.\d+)?/)
    ?.shift();

  if (!priceLabel) {
    throw Runtime.getState().logger.warn("Price label is undefined");
  }

  // get the price
  const price = new Decimal(priceLabel);

  // get the number of assignees
  const numberOfAssignees = source.length;

  const assigneeRewards = source.map((assignee) => {
    // get the assignee multiplier
    const assigneeMultiplier = new Decimal(1); // TODO: get the assignee multiplier from the database

    // calculate the total
    const score = price.div(numberOfAssignees).times(assigneeMultiplier);

    // return the total
    const details: ScoreDetails = {
      score: score,
      scoring: {
        comments: null,
        specification: null,
        task: {
          finalScore: score,
          multiplier: assigneeMultiplier,
        },
      },
      source: {
        comments: null,
        issue: issue,
      },
    };

    const totals: ScoresByUser = {
      [assignee.id]: {
        total: score,
        userId: assignee.id,
        username: assignee.login,
        class: "Issue Assignee Task",
        details: [details],
      },
    };

    return totals;
  });

  return assigneeRewards;
}
