import { UserScoreDetails, UserScoreTotals } from "./issue-shared-types";

export function sumTotalScores(allSourceScores: UserScoreDetails[]): { [userId: string]: UserScoreTotals } {
  const totals = allSourceScores.reduce((accumulator, currentScore) => {
    const { score, source } = currentScore;
    const userId = source.user.id;
    // const username = source.user.login;
    if (!accumulator[userId]) {
      accumulator[userId] = {
        total: score,
        details: [currentScore],
        user: source.user,
      } as UserScoreTotals;
    } else {
      accumulator[userId].total = accumulator[userId].total.plus(score);
      accumulator[userId].details.push(currentScore);
    }
    return accumulator;
  }, {} as { [userId: string]: UserScoreTotals });
  return totals;
}
