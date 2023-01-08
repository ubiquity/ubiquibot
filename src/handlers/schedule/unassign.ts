import { getBotContext } from "../../bindings";
import { listIssuesForRepo } from "../../helpers";
// import { LabelItem } from "../../types";

/**
 * @dev Check out the bounties which haven't been completed within the initial timeline
 *  and try to release the bounty back to dev pool
 */
export const checkBountiesToUnassign = async () => {
  const context = getBotContext();
  // const botConfig = getBotConfig();
  const { log } = context;
  log.info(`Getting all the issues...`);
  // const timeLabelsDefined = botConfig.price.timeLabels;

  // List all the issues in the repository. It may include `pull_request`
  // because GitHub's REST API v3 considers every pull request an issue
  const issues_opened = await listIssuesForRepo();

  const assigned_issues = issues_opened.filter((issue) => issue.assignee).filter((issue) => issue.title === "Test issue");
  // for (const active_issue of assigned_issues) {
  //     const labels = active_issue.labels;

  //     // get the time label from the `labels`
  //     const timeLabelsAssigned: LabelItem[] = [];
  //     for (const _label of labels) {
  //         const _label_type = typeof _label;
  //         const _label_name = _label_type === "string" ? _label.toString() : _label_type === "object" ? JSON.parse(_label.toString()).name : "unknown";

  //         const timeLabel = timeLabelsDefined.find((item) => item.name === _label_name);
  //         if (timeLabel) {
  //             timeLabelsAssigned.push(timeLabel);
  //         }
  //     }

  //     if (timeLabelsAssigned.length == 0) continue;

  //     const sorted = timeLabelsAssigned.sort((a, b) => a.weight - b.weight);
  //     const targetTimeLabel = sorted[0];
  //     const timeLineOfIssue = targetTimeLabel.value;
  //     if (timeLineOfIssue) {
  //         const created_at = new Date(active_issue.created_at);
  //         const curTime = new Date();
  //         if (curTime.getTime() > created_at.getTime() + timeLineOfIssue * 1000) {
  //             log.info(`Unassigning the issue due to the assigned duration ends`, {issue: active_issue.title, created_at: active_issue.created_at})
  //         }

  //     } else {
  //         log.info(`Time value is missing for ${targetTimeLabel.name}. Please check it out to make ${checkBountiesToUnassign.name} feature working`);
  //     }

  // }
  console.log("> issues_opened...");
  // console.log(assigned_issues.map(i => i.assignee));
  console.log(assigned_issues);
  console.log("> issues_opened... end");
};
