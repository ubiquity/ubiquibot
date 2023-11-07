import { UserScoreDetails, UserScoreTotals } from "./issue-shared-types";

export function sumTotalScores(allSourceScores: UserScoreDetails[]): { [userId: string]: UserScoreTotals } {
  const totals = allSourceScores.reduce((accumulator, currentScore) => {
    const { score, scoring, source } = currentScore;
    const userId = source.user.id;
    const username = source.user.login;
    if (!accumulator[userId]) {
      accumulator[userId] = {
        total: score,
        userId,
        username,
        class: scoring.comments ? scoring.comments[0].class : null, // not sure what this is supposed to be yet
        details: [currentScore],
      };
    } else {
      accumulator[userId].total = accumulator[userId].total.plus(score);
      accumulator[userId].details.push(currentScore);
    }
    return accumulator;
  }, {} as { [userId: string]: UserScoreTotals });
  return totals;
}
