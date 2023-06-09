import { addAssignees, addCommentToIssue, getAssignedIssues, getCommentsOfIssue, getPullRequestReviews, getPullRequests } from "../../../helpers";
import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { Payload, LabelItem, Comment, IssueType } from "../../../types";
import { deadLinePrefix } from "../../shared";
import { IssueCommentCommands } from "../commands";
import { getWalletAddress } from "../../../adapters/supabase";

export const assign = async (body: string) => {
  const context = getBotContext();
  const _payload = context.payload;
  const logger = getLogger();
  const config = getBotConfig();
  if (body != IssueCommentCommands.ASSIGN && body.replace(/`/g, "") != IssueCommentCommands.ASSIGN) {
    logger.info(`Skipping to assign. body: ${body}`);
    return;
  }

  const payload = _payload as Payload;
  logger.info(`Received '/assign' command from user: ${payload.sender.login}`);
  const issue = (_payload as Payload).issue;
  if (!issue) {
    logger.info(`Skipping '/assign' because of no issue instance`);
    return;
  }

  const prs = await getPullRequests(context, "open");
  const opened_prs = [];
  for (let i = 0; i < prs.length; i++) {
    const pr = prs[i];
    if (pr.user?.login !== payload.sender.login) continue;
    const reviews = await getPullRequestReviews(context, pr.number);
    if (reviews.length === 0 && (new Date().getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60) < 24) {
      opened_prs.push(pr);
    }
  }

  logger.info(`Opened Pull Requests with no reviews within 24 hours: ${JSON.stringify(opened_prs)}`);

  let assigned_issues = await getAssignedIssues(payload.sender.login);

  logger.info(`Max issue allowed is ${config.assign.bountyHunterMax}`);

  const issue_number = issue!.number;

  // check for max and enforce max
  if (assigned_issues.length + opened_prs.length >= config.assign.bountyHunterMax) {
    await addCommentToIssue(`Too many assigned issues, you have reached your max of ${config.assign.bountyHunterMax}`, issue_number);
    return;
  }

  if (issue!.state == IssueType.CLOSED) {
    logger.info("Skipping '/assign', reason: closed ");
    return "Skipping `/assign` since the issue is closed";
  }
  const _assignees = payload.issue?.assignees;
  const assignees = _assignees ?? [];

  if (assignees.length !== 0) {
    logger.info(`Skipping '/assign', reason: already assigned. assignees: ${assignees.length > 0 ? assignees.map((i) => i.login).join() : "NoAssignee"}`);
    return "Skipping `/assign` since the issue is already assigned";
  }

  // get the time label from the `labels`
  const labels = payload.issue?.labels;
  if (!labels) {
    logger.info(`No labels to calculate timeline`);
    return "Skipping `/assign` since no issue labels are set to calculate the timeline";
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
    logger.info(`No time labels to calculate timeline`);
    return "Skipping `/assign` since no time labels are set to calculate the timeline";
  }

  const sorted = timeLabelsAssigned.sort((a, b) => a.weight - b.weight);
  const targetTimeLabel = sorted[0];
  const duration = targetTimeLabel.value;
  if (!duration) {
    logger.info(`Missing configure for timelabel: ${targetTimeLabel.name}`);
    return "Skipping `/assign` since configuration is missing for the following labels";
  }

  const curDate = new Date();
  const curDateInMillisecs = curDate.getTime();
  const endDate = new Date(curDateInMillisecs + duration * 1000);
  let commit_msg = `@${payload.sender.login} ${deadLinePrefix} ${endDate.toUTCString()}`;

  if (!assignees.map((i) => i.login).includes(payload.sender.login)) {
    logger.info(`Adding the assignee: ${payload.sender.login}`);
    // assign default bounty account to the issue
    await addAssignees(issue_number!, [payload.sender.login]);
  }

  // double check whether the assign message has been already posted or not
  logger.info(`Creating an issue comment: ${commit_msg}`);
  const issue_comments = await getCommentsOfIssue(issue_number!);
  const comments = issue_comments.sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latest_comment = comments.length > 0 ? comments[0].body : undefined;
  if (latest_comment && commit_msg != latest_comment) {
    const recipient = await getWalletAddress(payload.sender.login);
    if (!recipient) {
      //no wallet found
      commit_msg =
        commit_msg +
        "\n\n" +
        "It looks like you haven't set your wallet address,\n" +
        "please use `/wallet 0x4FDE...BA18` to do so.\n" +
        "(It's required to be paid for the bounty)";
    } else {
      //wallet found
      commit_msg = commit_msg + "\n\n" + "Your currently set address is:\n" + recipient + "\n" + "please use `/wallet 0x4FDE...BA18` if you want to update it.";
    }
    return commit_msg;
  }
  return;
};
