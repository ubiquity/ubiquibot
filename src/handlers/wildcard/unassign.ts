import { getBotConfig, getLogger } from "../../bindings";
import { GLOBAL_STRINGS } from "../../configs/strings";
import { addAssignees, addCommentToIssue, getCommentsOfIssue, listIssuesForRepo, removeAssignees } from "../../helpers";
import { Comment, IssueType } from "../../types";
import { deadLinePrefix } from "../shared";

/**
 * @dev Check out the bounties which haven't been completed within the initial timeline
 *  and try to release the bounty back to dev pool
 */
export const checkBountiesToUnassign = async () => {
  const logger = getLogger();
  logger.info(`Getting all the issues...`);

  // List all the issues in the repository. It may include `pull_request`
  // because GitHub's REST API v3 considers every pull request an issue
  const issues_opened = await listIssuesForRepo(IssueType.OPEN);

  const assigned_issues = issues_opened.filter((issue) => issue.assignee);

  // Checking the bounties in parallel
  const res = await Promise.all(assigned_issues.map(async (issue) => checkBountyToUnassign(issue)));
  logger.info(`Checking expired bounties done! total: ${res.length}, unassigned: ${res.filter((i) => i).length}`);
};

const checkBountyToUnassign = async (issue: any): Promise<boolean> => {
  const logger = getLogger();
  const {
    unassign: { followUpTime, disqualifyTime },
  } = getBotConfig();
  logger.info(`Checking the bounty to unassign, issue_number: ${issue.number}`);
  const { unassignComment, askUpdate, assignees: globAssignees } = GLOBAL_STRINGS;
  const assignees = issue.assignees.map((i: any) => i.login);
  const comments = await getCommentsOfIssue(issue.number);
  if (!comments || comments.length == 0) return false;

  const timeline_comments = comments.filter((comment: Comment) => comment.body.includes(deadLinePrefix));
  const timelines = timeline_comments.map((comment: Comment) => new Date(comment.created_at).getTime()).filter((i: number) => i > 0);
  if (timelines.length === 0) return false;
  const sorted = timelines.sort((a: number, b: number) => b - a);
  const bountyStartTime = sorted[0];

  const askUpdateComments = comments
    .filter((comment: Comment) => comment.body.includes(askUpdate))
    .sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const lastAskTime = askUpdateComments.length > 0 ? new Date(askUpdateComments[0].created_at).getTime() : bountyStartTime;
  const answerCommentsForLastQuestion = comments
    .filter((comment: Comment) => new Date(comment.created_at).getTime() > bountyStartTime && assignees.includes(comment.user.login))
    .map((a: Comment) => new Date(a.created_at).getTime())
    .sort((a: number, b: number) => b - a);
  const lastAnswerTime = answerCommentsForLastQuestion.length > 0 ? answerCommentsForLastQuestion[0] : bountyStartTime;
  const curTimestamp = new Date().getTime();
  const passedDuration = curTimestamp - lastAnswerTime;

  if (passedDuration >= disqualifyTime) {
    logger.info(
      `Unassigning... lastAnswerTime: ${lastAnswerTime}, curTime: ${curTimestamp}, passedDuration: ${passedDuration}, followUpTime: ${followUpTime}, disqualifyTime: ${disqualifyTime}`
    );
    // remove assignees from the issue
    await removeAssignees(issue.number, assignees);
    await addCommentToIssue(`${unassignComment}`, issue.number);
    await addAssignees(issue.number, globAssignees);

    return true;
  } else if (passedDuration >= followUpTime) {
    logger.info(
      `Asking for updates... lastAnswerTime: ${lastAnswerTime}, curTime: ${curTimestamp}, passedDuration: ${passedDuration}, followUpTime: ${followUpTime}, disqualifyTime: ${disqualifyTime}`
    );

    if (lastAskTime > lastAnswerTime) {
      logger.info(`Skipping posting an update message cause its been already asked, lastAskTime: ${lastAskTime}, lastAnswerTime: ${lastAnswerTime}`);
    } else await addCommentToIssue(`${askUpdate} @${assignees[0]}`, issue.number);
  }

  return false;
};
