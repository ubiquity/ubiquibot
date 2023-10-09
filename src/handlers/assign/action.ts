import Runtime from "../../bindings/bot-runtime";
import { addCommentToIssue, closePullRequest, calculateWeight, calculateDuration } from "../../helpers";
import { gitLinkedPrParser } from "../../helpers/parser";
import { Payload, LabelItem } from "../../types";
import { deadLinePrefix } from "../shared";

const exclude_accounts: string[] = [];
export async function commentWithAssignMessage(): Promise<void> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const config = runtime.botConfig;
  const logger = runtime.logger;
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

  const flattenedAssignees = assignees.reduce((acc, cur) => `${acc} @${cur.login}`, "");

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
    const _label_name =
      _label_type === "string" ? _label.toString() : _label_type === "object" ? _label.name : "unknown";

    const timeLabel = timeLabelsDefined.find((item) => item.name === _label_name);
    if (timeLabel) {
      timeLabelsAssigned.push(timeLabel);
    }
  }

  if (timeLabelsAssigned.length == 0) {
    logger.debug(`No labels to calculate timeline`);
    return;
  }

  const sorted = timeLabelsAssigned.sort((a, b) => calculateWeight(a) - calculateWeight(b));
  const targetTimeLabel = sorted[0];
  const duration = calculateDuration(targetTimeLabel);
  if (!duration) {
    logger.debug(`Missing configure for timelabel: ${targetTimeLabel.name}`);
    return;
  }

  const currentDate = new Date();
  const currentDateInMilliseconds = currentDate.getTime();
  const endDate = new Date(currentDateInMilliseconds + duration * 1000);
  const commitMessage = `${flattenedAssignees} ${deadLinePrefix} ${endDate.toUTCString().replace("GMT", "UTC")}`;
  logger.debug(`Creating an issue comment, commit_msg: ${commitMessage}`);

  await addCommentToIssue(commitMessage, payload.issue?.number);
}

export const closePullRequestForAnIssue = async (): Promise<void> => {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;
  const payload = context.payload as Payload;
  if (!payload.issue?.number) return;

  const prs = await gitLinkedPrParser({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
  });

  if (!prs.length) return;

  logger.info(`Opened prs for this issue: ${JSON.stringify(prs)}`);
  let comment = `These linked pull requests are closed: `;
  for (let i = 0; i < prs.length; i++) {
    await closePullRequest(prs[i].prNumber);
    comment += ` <a href="${prs[i].prHref}">#${prs[i].prNumber}</a> `;
  }
  await addCommentToIssue(comment, payload.issue.number);
};
