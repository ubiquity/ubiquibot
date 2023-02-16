import { getBotConfig, getBotContext } from "../../../bindings";
import { BountyAccount } from "../../../configs";
import { addAssignees, addCommentToIssue, removeAssignees } from "../../../helpers";
import { Payload, LabelItem } from "../../../types";
import { deadLinePrefix } from "../../shared";

export const assign = async () => {
  const { log, payload: _payload } = getBotContext();
  const config = getBotConfig();
  const payload = _payload as Payload;
  log.info(`Received '/assign' command from user: ${payload.sender.login}`);
  const issue_number = (_payload as Payload).issue?.number;
  const _assignees = payload.issue?.assignees;
  const assignees = _assignees ? _assignees?.filter((i) => ![BountyAccount].includes(i.login)) : [];

  // get the time label from the `labels`
  const labels = payload.issue?.labels;
  if (!labels) {
    log.info(`No labels to calculate timeline`);
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
    log.info(`No labels to calculate timeline`);
    return;
  }

  const sorted = timeLabelsAssigned.sort((a, b) => a.weight - b.weight);
  const targetTimeLabel = sorted[0];
  const duration = targetTimeLabel.value;
  if (!duration) {
    log.info(`Missing configure for timelabel: ${targetTimeLabel.name}`);
    return;
  }

  const curDate = new Date();
  const curDateInMillisecs = curDate.getTime();
  const endDate = new Date(curDateInMillisecs + duration * 1000);
  const commit_msg = `@${payload.sender.login} ${deadLinePrefix} ${endDate.toLocaleDateString("en-us")}`;
  log.debug(`Creating an issue comment`, { commit_msg });

  if (assignees) {
    // remove assignees from the issue
    await removeAssignees(issue_number!, assignees);
  }

  // assign default bounty account to the issue
  await addAssignees(issue_number!, [payload.sender.login]);

  await addCommentToIssue(commit_msg, issue_number!);
};
