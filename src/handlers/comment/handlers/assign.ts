import { getBotConfig, getBotContext } from "../../../bindings";
import { addAssignees, addCommentToIssue, getCommentsOfIssue, removeAssignees } from "../../../helpers";
import { Payload, LabelItem, Comment } from "../../../types";
import { deadLinePrefix } from "../../shared";
import { IssueCommentCommands } from "../commands";

export const assign = async (body: string) => {
  const { log, payload: _payload } = getBotContext();
  const config = getBotConfig();
  if (body != IssueCommentCommands.ASSIGN && body.replace(/`/g, "") != IssueCommentCommands.ASSIGN) {
    log.info(`Skipping to assign. body: ${body}`);
    return;
  }

  const payload = _payload as Payload;
  log.info(`Received '/assign' command from user: ${payload.sender.login}`);
  const issue_number = (_payload as Payload).issue?.number;
  const _assignees = payload.issue?.assignees;
  const assignees = _assignees ?? [];

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

  log.info(`Creating an issue comment: ${commit_msg}`);

  if (assignees.length > 0) {
    const filteredAssignees = assignees.filter((i) => i.login != payload.sender.login);
    if (filteredAssignees.length > 0) {
      const assigneeNamesToRemove = filteredAssignees.map((i) => i.login) as string[];
      // remove assignees from the issue
      log.info(`Removing the previous assignees... assignees: ${assigneeNamesToRemove}`);
      await removeAssignees(issue_number!, assigneeNamesToRemove);
    }
  }

  if (!assignees.map((i) => i.login).includes(payload.sender.login)) {
    log.info(`Adding the assignee: ${payload.sender.login}`);
    // assign default bounty account to the issue
    await addAssignees(issue_number!, [payload.sender.login]);
  }

  // double check whether the assign message has been already posted or not
  const issue_comments = await getCommentsOfIssue(issue_number!);
  const comments = issue_comments.sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latest_comment = comments.length > 0 ? comments[0].body : undefined;
  if (latest_comment && commit_msg != latest_comment) {
    await addCommentToIssue(commit_msg, issue_number!);
  }
};
