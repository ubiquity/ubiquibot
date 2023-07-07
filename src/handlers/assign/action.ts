import { getBotConfig, getBotContext, getLogger } from "../../bindings";
import { addCommentToIssue, closePullRequest, getOpenedPullRequestsForAnIssue } from "../../helpers";
import { Payload, LabelItem } from "../../types";
import { deadLinePrefix } from "../shared";

const exclude_accounts: string[] = [];
export const commentWithAssignMessage = async (): Promise<void> => {
  const context = getBotContext();
  const config = getBotConfig();
  const logger = getLogger();
  const payload = context.payload as Payload;
  if (!payload.issue) {
    logger.debug(`Empty issue object`);
    return;
  }

  logger.info(`Commenting timeline message for issue: ${payload.issue.number}`);

  const _assignees = payload.issue?.assignees;
  const assignees = _assignees ? _assignees?.filter((i) => !exclude_accounts.includes(i.login)) : [];
  const existAssignees = assignees && assignees.length > 0;
  if (!existAssignees) {
    logger.debug(`No assignees for comment`);
    return;
  }

  const flattened_assignees = assignees.reduce((acc, cur) => `${acc} @${cur.login}`, "");

  // get the time label from the `labels`
  const labels = payload.issue?.labels;
  if (!labels) {
    logger.debug(`No labels to calculate timeline`);
    return;
  }
  const timeLabelsDefined = config.price.timeLabels;
  const timeLabelsAssigned: LabelItem[] = [];
  for (const _label of labels) {
    const _label_type = typeof _label;
    const _label_name = _label_type === "string" ? _label.toString() : _label_type === "object" ? _label.name : "unknown";

    const timeLabel = timeLabelsDefined.find((item) => item.name === _label_name);
    if (timeLabel) {
      timeLabelsAssigned.push(timeLabel);
    }
  }

  if (timeLabelsAssigned.length == 0) {
    logger.debug(`No labels to calculate timeline`);
    return;
  }

  const sorted = timeLabelsAssigned.sort((a, b) => a.weight - b.weight);
  const targetTimeLabel = sorted[0];
  const duration = targetTimeLabel.value;
  if (!duration) {
    logger.debug(`Missing configure for timelabel: ${targetTimeLabel.name}`);
    return;
  }

  const curDate = new Date();
  const curDateInMillisecs = curDate.getTime();
  const endDate = new Date(curDateInMillisecs + duration * 1000);
  const commit_msg = `${flattened_assignees} ${deadLinePrefix} ${endDate.toUTCString()}`;
  logger.debug(`Creating an issue comment, commit_msg: ${commit_msg}`);

  await addCommentToIssue(commit_msg, payload.issue?.number);
};

export const closePullRequestForAnIssue = async (): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  if (!payload.issue?.number) return;

  const prs = await getOpenedPullRequestsForAnIssue(payload.issue.number, "");
  if (!prs.length) return;
  logger.info(`Opened prs for this issue: ${JSON.stringify(prs)}`);

  let comment = `These linked pull requests are closed: `;
  let noPullRequestsComment = `Failed To close these pull requests: `;

  let deleteCount = 0;
  for (const pr of prs) {
    const deleted = await closePullRequest(pr.number);
    if (!deleted) {
      noPullRequestsComment += ` <a href="${pr._links.html.href}">#${pr.number}</a> `;
      continue;
    }
    comment += ` <a href="${pr._links.html.href}">#${pr.number}</a> `;
    deleteCount++;
  }

  // Check if All PRs are closed, if not send failed PRs list>
  deleteCount !== prs.length && (await addCommentToIssue(noPullRequestsComment, payload.issue.number));

  // If Anyone of PR closed send PR closed message
  deleteCount > 0 && (await addCommentToIssue(comment, payload.issue.number));
};
