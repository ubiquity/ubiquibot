import { addAssignees, getAssignedIssues, getAvailableOpenedPullRequests, getAllIssueComments } from "../../../helpers";
import { getBotConfig, getBotContext, getLogger } from "../../../bindings";
import { Payload, LabelItem, Comment, IssueType } from "../../../types";
import { deadLinePrefix } from "../../shared";
import { getWalletAddress, getWalletMultiplier, getMultiplierReason } from "../../../adapters/supabase";
import { tableComment } from "./table";
import { bountyInfo } from "../../wildcard";
import { ASSIGN_COMMAND_ENABLED, GLOBAL_STRINGS } from "../../../configs";

export const assign = async (body: string) => {
  const { payload: _payload } = getBotContext();
  const logger = getLogger();
  const config = getBotConfig();

  const payload = _payload as Payload;
  const organization = payload.organization;

  logger.info(`Received '/assign' command from user: ${payload.sender.login}, body: ${body}`);
  const issue = (_payload as Payload).issue;
  if (!issue) {
    logger.info(`Skipping '/assign' because of no issue instance`);
    return "Skipping '/assign' because of no issue instance";
  }

  if (!organization?.id) {
    logger.info(`Skipping '/assign' because there's no organization details`);
    return "Skipping '/assign' because of no issue instance";
  }

  if (!ASSIGN_COMMAND_ENABLED) {
    logger.info(`Ignore '/assign' command from user: ASSIGN_COMMAND_ENABLED config is set false`);
    return GLOBAL_STRINGS.assignCommandDisabledComment;
  }

  const openedPullRequests = await getAvailableOpenedPullRequests(payload.sender.login);
  logger.info(`Opened Pull Requests with approved reviews or with no reviews but over 24 hours have passed: ${JSON.stringify(openedPullRequests)}`);

  const assignedIssues = await getAssignedIssues(payload.sender.login);
  logger.info(`Max issue allowed is ${config.assign.bountyHunterMax}`);

  // check for max and enforce max
  if (assignedIssues.length - openedPullRequests.length >= config.assign.bountyHunterMax) {
    return `Too many assigned issues, you have reached your max of ${config.assign.bountyHunterMax}`;
  }

  if (issue.state == IssueType.CLOSED) {
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
    const _labelType = typeof _label;
    const _labelName = _labelType === "string" ? _label.toString() : _labelType === "object" ? _label.name : "unknown";

    const timeLabel = timeLabelsDefined.find((item) => item.name === _labelName);
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
    logger.info(`Missing configure for time label: ${targetTimeLabel.name}`);
    return "Skipping `/assign` since configuration is missing for the following labels";
  }

  const startTime = new Date().getTime();
  const endTime = new Date(startTime + duration * 1000);

  const comment = {
    deadline: endTime.toUTCString(),
    wallet: (await getWalletAddress(payload.sender.login)) || "Please set your wallet address to use `/wallet 0x4FDE...BA18`",
    multiplier: "1.00",
    reason: await getMultiplierReason(payload.sender.login, organization?.id?.toString()),
    bounty: `Permit generation skipped since price label is not set`,
    commit: `@${payload.sender.login} ${deadLinePrefix} ${endTime.toUTCString()}`,
    tips: `<h6>Tips:</h6>
    <ul>
    <li>Use <code>/wallet 0x4FDE...BA18</code> if you want to update your registered payment wallet address @user.</li>
    <li>Be sure to open a draft pull request as soon as possible to communicate updates on your progress.</li>
    <li>Be sure to provide timely updates to us when requested, or you will be automatically unassigned from the bounty.</li>
    <ul>`,
  };

  if (!assignees.map((i) => i.login).includes(payload.sender.login)) {
    logger.info(`Adding the assignee: ${payload.sender.login}`);
    await addAssignees(issue.number, [payload.sender.login]);
  }

  // double check whether the assign message has been already posted or not
  logger.info(`Creating an issue comment: ${comment.commit}`);
  const issueComments = await getAllIssueComments(issue.number);
  const comments = issueComments.sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestComment = comments.length > 0 ? comments[0].body : undefined;
  if (latestComment && comment.commit != latestComment) {
    const multiplier = await getWalletMultiplier(payload.sender.login, organization?.id?.toString());
    if (multiplier) {
      comment.multiplier = multiplier.toFixed(2);
    }
    const issueDetailed = bountyInfo(issue);
    if (issueDetailed.priceLabel) {
      comment.bounty = (+issueDetailed.priceLabel.substring(7, issueDetailed.priceLabel.length - 4) * multiplier).toString() + " USD";
    }
    return tableComment(comment) + comment.tips;
  }
  return;
};
