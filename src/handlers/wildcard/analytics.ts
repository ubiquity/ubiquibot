import { getMaxIssueNumber, upsertIssue, upsertUser } from "../../adapters/supabase";
import { getLogger } from "../../bindings";
import { listIssuesForRepo, getUser, calculateWeight } from "../../helpers";
import { BotContext, Issue, IssueType, User, UserProfile } from "../../types";

/**
 * Checks the issue whether it's a bounty for hunters or an issue for not
 * @param issue - The issue object
 * @returns If bounty - true, If issue - false
 */
export const bountyInfo = (
  context: BotContext,
  issue: Issue
): {
  isBounty: boolean;
  timelabel: string | undefined;
  priorityLabel: string | undefined;
  priceLabel: string | undefined;
} => {
  const config = context.botConfig;
  const labels = issue.labels;

  const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const isBounty = timeLabels.length > 0 && priorityLabels.length > 0;

  const minTimeLabel = timeLabels.length > 0 ? timeLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : undefined;
  const minPriorityLabel = priorityLabels.length > 0 ? priorityLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : undefined;

  const priceLabel = labels.find((label) => label.name.includes("Price"))?.name;

  return {
    isBounty,
    timelabel: minTimeLabel,
    priorityLabel: minPriorityLabel,
    priceLabel,
  };
};

/**
 * Collects all the analytics information by scanning the issues opened | closed
 */
export const collectAnalytics = async (context: BotContext): Promise<void> => {
  const logger = getLogger();
  const {
    mode: { disableAnalytics },
  } = context.botConfig;
  if (disableAnalytics) {
    logger.info(`Skipping to collect analytics, reason: mode=${disableAnalytics}`);
    return;
  }
  logger.info("Collecting analytics information...");
  const maximumIssueNumber = await getMaxIssueNumber();

  let fetchDone = false;
  const perPage = 30;
  let curPage = 1;
  while (!fetchDone) {
    const issues = await listIssuesForRepo(context, IssueType.ALL, perPage, curPage);

    // need to skip checking the closed issues already stored in the db and filter them by doing a sanitation checks.
    // sanitation checks would be basically checking labels of the issue
    // whether the issue has both `priority` label and `timeline` label
    const bounties = issues.filter((issue) => bountyInfo(context, issue as Issue).isBounty);

    // collect assignees from both type of issues (opened/closed)
    const assignees = bounties.filter((bounty) => bounty.assignee).map((bounty) => bounty.assignee as User);

    // remove duplication by assignee
    const tmp = assignees.map((i) => i.login);
    const assigneesToUpsert = assignees.filter((assignee, pos) => tmp.indexOf(assignee.login) == pos);
    const userProfilesToUpsert = await Promise.all(
      assigneesToUpsert.map(async (assignee) => {
        const res = await getUser(context, assignee.login);
        return res as UserProfile;
      })
    );

    logger.info(
      `Upserting users: ${userProfilesToUpsert
        .filter((i) => i.login)
        .map((i) => i.login)
        .toString()}`
    );

    await Promise.all(userProfilesToUpsert.map((i) => upsertUser(i)));

    // No need to update the record for the bounties already closed
    const bountiesToUpsert = bounties.filter((bounty) => (bounty.state === IssueType.CLOSED ? bounty.number > maximumIssueNumber : true));
    logger.info(`Upserting bounties: ${bountiesToUpsert.map((i) => i.title).toString()}`);
    await Promise.all(
      bountiesToUpsert.map((i) => {
        const additions = bountyInfo(context, i as Issue);
        if (additions.timelabel && additions.priorityLabel && additions.priceLabel)
          return upsertIssue(i as Issue, {
            labels: {
              timeline: additions.timelabel,
              priority: additions.priorityLabel,
              price: additions.priceLabel,
            },
          });
        return undefined;
      })
    );

    if (issues.length < perPage) fetchDone = true;
    else curPage++;
  }
  logger.info("Collecting analytics finished...");
};
