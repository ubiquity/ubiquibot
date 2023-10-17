import Runtime from "../../bindings/bot-runtime";
import {
  getAllIssueComments,
  getCommitsOnPullRequest,
  getOpenedPullRequestsForAnIssue,
  getReviewRequests,
  listAllIssuesForRepo,
  removeAssignees,
} from "../../helpers";
import { Comment, Issue, IssueType, Payload, UserType } from "../../types";

const requestContributorUpdate = "Do you have any updates";

export async function checkTasksToUnassign() {
  // Check out the tasks which haven't been completed within the initial timeline
  // and release the task back to dev pool
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  logger.info(`Getting all the issues...`);

  // List all the issues in the repository. It may include `pull_request`
  // because GitHub's REST API v3 considers every pull request an issue
  const issues_opened = await listAllIssuesForRepo(IssueType.OPEN);

  const assigned_issues = issues_opened.filter((issue) => issue.assignee);

  // Checking the tasks in parallel
  const res = await Promise.all(assigned_issues.map(async (issue: Issue) => checkTaskToUnassign(issue)));
  logger.info("Checking expired tasks done!", { total: res.length, unassigned: res.filter((i) => i).length });
}

async function checkTaskToUnassign(issue: Issue) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const context = runtime.eventContext;
  const payload = context.payload as Payload;
  const unassign = runtime.botConfig.unassign;
  const { disqualifyTime, followUpTime } = unassign;

  logger.info("Checking the task to unassign...", { issue_number: issue.number });
  const assignees = issue.assignees.map((i) => i.login);
  const comments = await getAllIssueComments(issue.number);
  if (!comments || comments.length == 0) return false;

  const askUpdateComments = comments
    .filter((comment: Comment) => comment.body.includes(requestContributorUpdate))
    .sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const lastAskTime =
    askUpdateComments.length > 0
      ? new Date(askUpdateComments[0].created_at).getTime()
      : new Date(issue.created_at).getTime();
  const curTimestamp = new Date().getTime();
  const lastActivity = await lastActivityTime(issue, comments);
  const passedDuration = curTimestamp - lastActivity.getTime();
  const pullRequest = await getOpenedPullRequestsForAnIssue(issue.number, issue.assignee.login);

  if (pullRequest.length > 0) {
    const reviewRequests = await getReviewRequests(
      context,
      pullRequest[0].number,
      payload.repository.owner.login,
      payload.repository.name
    );
    if (!reviewRequests || reviewRequests.users?.length > 0) {
      return false;
    }
  }

  if (passedDuration >= disqualifyTime || passedDuration >= followUpTime) {
    if (passedDuration >= disqualifyTime) {
      // remove assignees from the issue
      await removeAssignees(issue.number, assignees);

      return logger.warn("The task has been unassigned due to lack of updates", {
        issue_number: issue.number,
        passedDuration,
        disqualifyTime,
      });
    } else if (passedDuration >= followUpTime) {
      logger.info("Asking for updates...", {
        lastActivityTime: lastActivity.getTime(),
        disqualifyTime,
        issue_number: issue.number,
        passedDuration,
        followUpTime,
      });

      if (lastAskTime > lastActivity.getTime()) {
        logger.info(
          `Skipping posting an update message cause its been already asked, lastAskTime: ${lastAskTime}, lastActivityTime: ${lastActivity.getTime()}`
        );
      } else {
        return logger.warn(
          "Do you have any updates? If you would like to release the task back to the DevPool, please comment `/stop`",
          {
            issue_number: issue.number,
            passedDuration,
            followUpTime,
          }
        );
      }
    }
  }
}

async function lastActivityTime(issue: Issue, comments: Comment[]): Promise<Date> {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  logger.info("Checking the latest activity for the issue...", { issue_number: issue.number });
  const assignees = issue.assignees.map((i) => i.login);
  const activities: Date[] = [new Date(issue.created_at)];

  const lastAssignCommentOfHunter = comments
    .filter(
      (comment) =>
        comment.user.type === UserType.Bot &&
        comment.body.includes(assignees[0]) &&
        comment.body.includes("the deadline is at")
    )
    .sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (lastAssignCommentOfHunter.length > 0) activities.push(new Date(lastAssignCommentOfHunter[0].created_at));

  // get last comment on the issue
  const lastCommentsOfHunterForIssue = comments
    .filter((comment) => assignees.includes(comment.user.login))
    .sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (lastCommentsOfHunterForIssue.length > 0) activities.push(new Date(lastCommentsOfHunterForIssue[0].created_at));

  const openedPrsForIssue = await getOpenedPullRequestsForAnIssue(issue.number, assignees[0]);
  const pr = openedPrsForIssue.length > 0 ? openedPrsForIssue[0] : undefined;
  // get last commit and last comment on the linked pr
  if (pr) {
    const commits = (await getCommitsOnPullRequest(pr.number))
      .filter((it) => it.commit.committer?.date)
      .sort(
        (a, b) => new Date(b.commit.committer?.date ?? 0).getTime() - new Date(a.commit.committer?.date ?? 0).getTime()
      );
    const prComments = (await getAllIssueComments(pr.number))
      .filter((comment) => comment.user.login === assignees[0])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (commits.length > 0) activities.push(new Date(commits[0].commit.committer?.date ?? 0));
    if (prComments.length > 0) activities.push(new Date(prComments[0].created_at));
  }

  activities.sort((a, b) => b.getTime() - a.getTime());

  return activities[0];
}
