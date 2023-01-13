import { getBotContext } from "../../bindings";
import { BountyAccount } from "../../configs";
import { addAssignees, addCommentToIssue, getCommentsOfIssue, listIssuesForRepo, removeAssignees } from "../../helpers";
import { IssueType } from "../../types";
import { deadLinePrefix } from "../shared";

/**
 * @dev Check out the bounties which haven't been completed within the initial timeline
 *  and try to release the bounty back to dev pool
 */
export const checkBountiesToUnassign = async () => {
  const context = getBotContext();
  const { log } = context;
  log.info(`Getting all the issues...`);

  // List all the issues in the repository. It may include `pull_request`
  // because GitHub's REST API v3 considers every pull request an issue
  const issues_opened = await listIssuesForRepo(IssueType.OPEN);

  console.log("Getting issues done!");
  const assigned_issues = issues_opened.filter((issue) => issue.assignee);
  console.log("Getting assigned issues done!");

  // Checking the bounties in parallel
  const res = await Promise.all(assigned_issues.map((issue) => checkBountyToUnassign(issue)));
  log.info("Checking expired bounties done!", { total: res.length, unassigned: res.filter((i) => i).length });
};

const checkBountyToUnassign = async (issue: any): Promise<boolean> => {
  const context = getBotContext();
  const { log } = context;
  const comments = await getCommentsOfIssue(issue.number);
  if (!comments) return false;
  const timeline_comments = comments.filter((comment: any) => comment.body.includes(deadLinePrefix));

  const timelines = timeline_comments.map((timeline_comment: any) => getEndTimeFromComment(timeline_comment.body as string)).filter((i: number) => i > 0);
  if (timelines.length === 0) return false;

  const sorted = timelines.sort((a: number, b: number) => b - a);
  const deadLineOfIssue = sorted[0];
  const curTimestamp = new Date().getTime();

  if (curTimestamp > deadLineOfIssue) {
    log.debug(`Releasing the bounty back to dev pool because the allocated duration already ended`, { deadLineOfIssue, curTimestamp });
    await addCommentToIssue(`Releasing the bounty back to dev pool because the allocated duration already ended`);

    // remove assignees from the issue
    const assignees = issue.assignees.map((i: any) => i.login);
    await removeAssignees(issue.number, assignees);

    // assign default bounty account to the issue
    await addAssignees(issue.number, [BountyAccount]);

    return true;
  }

  return false;
};

const getEndTimeFromComment = (body: string): number => {
  const expression = new RegExp(`${deadLinePrefix} (.+)`, "gm");
  const regRes = body.match(expression);
  if (!regRes) return 0;

  const datetime_string = regRes[0].split(`${deadLinePrefix} `)[1];
  const endDate = new Date(datetime_string);
  return endDate.getTime();
};
