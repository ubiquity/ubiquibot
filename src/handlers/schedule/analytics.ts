import { getMaxIssueNumber } from "../../adapters/supabase";
import { getBotConfig, getBotContext } from "../../bindings"
import { listIssuesForRepo } from "../../helpers";
import { Issue, IssueType } from "../../types";

export const isBounty = (issue: Issue): boolean => {
    const config = getBotConfig();
    const labels = issue.labels;
    const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
    const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  
    return timeLabels.length > 0 && priorityLabels.length > 0;
}

/**
 * Collects all the analytics information by scanning the issues opened | closed
 */
export const collectAnalytics = async (): Promise<void> => {

    const { log } = getBotContext();
    log.info("Collecting analytics information...");
    const maximumIssueNumber = await getMaxIssueNumber();

    let fetchDone = false;
    const perPage = 30;
    let curPage = 1;
    while(!fetchDone) {
        const issues = await listIssuesForRepo(IssueType.ALL, perPage, curPage);

        // need to skip checking the closed issues already stored in the db and filter them by doing a sanitation checks 
        // sanitation checks would be basically checking labels of the issue 
        // whether the issue has both `priority` label and `timeline` label
        const bounties = issues.filter(issue => isBounty(issue as Issue));
        
        // No need to update the record for the bounties already closed
        const filteredByIssueNumber = bounties.filter((bounty) => bounty.state === IssueType.CLOSED ? bounty.number > maximumIssueNumber : true);
        console.log({filteredByIssueNumber});

        if (issues.length < perPage) fetchDone = true;
        else curPage++;
    }
}

