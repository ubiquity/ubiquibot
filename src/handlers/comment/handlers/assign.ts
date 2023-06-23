import { addAssignees, addCommentToIssue, getAssignedIssues, getCommentsOfIssue, getAvailableOpenedPullRequests } from "../../../helpers";
import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { Payload, LabelItem, Comment, IssueType } from "../../../types";
import { deadLinePrefix } from "../../shared";
import { IssueCommentCommands } from "../commands";
import { getWalletAddress, getWalletMultiplier, getWalletReason } from "../../../adapters/supabase";
import { tableComment } from "./table";
import { bountyInfo } from "../../wildcard";

export const assign = async (body: string) => {
  const { payload: _payload } = getBotContext();
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

  const opened_prs = await getAvailableOpenedPullRequests(payload.sender.login);

  logger.info(`Opened Pull Requests with no reviews but over 24 hours have passed: ${JSON.stringify(opened_prs)}`);

  let assigned_issues = await getAssignedIssues(payload.sender.login);

  logger.info(`Max issue allowed is ${config.assign.bountyHunterMax}`);

  const issue_number = issue!.number;

  // check for max and enforce max
  if (assigned_issues.length - opened_prs.length >= config.assign.bountyHunterMax) {
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
  const deadline_msg = endDate.toUTCString();

  let wallet_msg, multiplier_msg, reason_msg, bounty_msg;
  const tips_msg = `\nTips:\n
  - Use /wallet 0x4FDE...BA18 if you want to update your registered payment wallet address ${payload.sender.login}
  - Be sure to open a draft pull request as soon as possible to communicate updates on your progress.
  - Be sure to provide timely updates to us when requested, or you will be automatically unassigned from the bounty.`;
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
      wallet_msg = "Please set your wallet address to use `/wallet 0x4FDE...BA18`";
    } else {
      //wallet found
      wallet_msg = recipient;
    }
    const multiplier = await getWalletMultiplier(payload.sender.login);
    if (!multiplier) {
      multiplier_msg = "1.00";
    } else {
      multiplier_msg = multiplier.toFixed(2);
    }
    const issueDetailed = bountyInfo(issue);
    if (!issueDetailed.priceLabel) {
      bounty_msg = `Permit generation skipped since price label is not set`;
    } else {
      bounty_msg = (+issueDetailed.priceLabel!.substring(7, issueDetailed.priceLabel!.length - 4) * multiplier).toString() + " USD";
    }
    const reason = await getWalletReason(payload.sender.login);
    reason_msg = reason ? reason : "";
    return tableComment(deadline_msg, wallet_msg, multiplier_msg, reason_msg, bounty_msg) + tips_msg;
  }
  return;
};
