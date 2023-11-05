import { ScoringAndSourcesByContributionClass } from "./scoreSources";
import { ScoresByUser } from "./issue-shared-types";

export function sumTotalScoresPerContributor(allSourceScores: ScoringAndSourcesByContributionClass): ScoresByUser {
  const totals = Object.entries(allSourceScores).reduce((accumulator, [key, value]) => {
    const { total, ...details } = value;
    if (!accumulator[key]) {
      accumulator[key] = {
        total,
        userId: details.userId,
        username: details.username,
        class: details.class,
        details: [details],
      };
    } else {
      accumulator[key].total = accumulator[key].total.plus(total);
      accumulator[key].details.push(details);
    }
    return accumulator;
  }, {} as ScoresByUser);
  return totals;
}
