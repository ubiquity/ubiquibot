import { Context } from "probot";
import { AssignEvent, Comment, IssueType, Payload, StreamlinedComment, UserType } from "../types";
import { checkRateLimitGit } from "../utils";
import { getBotConfig, getBotContext, getLogger } from "../bindings";
import { GitHubLogger } from "../adapters/supabase";

let logger: GitHubLogger;

export async function getAllIssueEvents() {
  logger = getLogger();
  const context = getBotContext();

  const payload = context.payload as Payload;
  if (!payload.issue) return;

  let shouldFetch = true;
  let page_number = 1;
  const events = [];

  try {
    while (shouldFetch) {
      // Fetch issue events
      const response = await context.octokit.issues.listEvents({
        owner: payload.repository.owner.login,
        repo: payload.repository.full_name,
        issue_number: payload.issue.number,
        per_page: 100,
        page: page_number,
      });

      await checkRateLimitGit(response?.headers);

      if (response?.data?.length > 0) {
        events.push(...response.data);
        page_number++;
      } else {
        shouldFetch = false;
      }
    }
  } catch (e: unknown) {
    shouldFetch = false;
    logger.error(`Getting all issue events failed, reason: ${e}`);
    return null;
  }
  return events;
}

export async function getAllLabeledEvents() {
  const events = await getAllIssueEvents();
  if (!events) return null;
  return events.filter((event) => event.event === "labeled");
}

export async function clearAllPriceLabelsOnIssue(): Promise<void> {
  const context = getBotContext();

  const payload = context.payload as Payload;

  if (!payload.issue) return;

  const labels = payload.issue.labels;
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));

  if (!issuePrices.length) return;

  try {
    await context.octokit.issues.removeLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      name: issuePrices[0].name.toString(),
    });
  } catch (e: unknown) {
    logger.debug(`Clearing all price labels failed! reason: ${e}`);
  }
}

export async function addLabelToIssue(labelName: string) {
  const context = getBotContext();

  const payload = context.payload as Payload;
  if (!payload.issue) {
    logger.debug("Issue object is null");
    return;
  }

  try {
    await context.octokit.issues.addLabels({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      labels: [labelName],
    });
  } catch (e: unknown) {
    logger.debug(`Adding a label to issue failed! reason: ${e}`);
  }
}

export async function listIssuesForRepo(
  state: "open" | "closed" | "all" = "open",
  per_page = 30,
  page = 1,
  sort: "created" | "updated" | "comments" = "created",
  direction: "desc" | "asc" = "desc"
) {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const response = await context.octokit.issues.listForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    per_page,
    page,
    sort,
    direction,
  });

  await checkRateLimitGit(response.headers);

  if (response.status === 200) {
    return response.data;
  } else {
    return [];
  }
}

export async function listAllIssuesForRepo(state: "open" | "closed" | "all" = "open") {
  const issuesArr = [];
  let fetchDone = false;
  const perPage = 100;
  let curPage = 1;
  while (!fetchDone) {
    const issues = await listIssuesForRepo(state, perPage, curPage);

    // push the objects to array
    issuesArr.push(...issues);

    if (issues.length < perPage) fetchDone = true;
    else curPage++;
  }

  return issuesArr;
}

export async function addCommentToIssue(msg: string, issue_number: number) {
  const context = getBotContext();

  const payload = context.payload as Payload;

  try {
    await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      body: msg,
    });
  } catch (e: unknown) {
    logger.debug(`Adding a comment failed! reason: ${e}`);
  }
}

export async function updateCommentOfIssue(msg: string, issue_number: number, reply_to: Comment) {
  const context = getBotContext();

  const payload = context.payload as Payload;

  try {
    const appResponse = await context.octokit.apps.getAuthenticated();
    const { name, slug } = appResponse.data;
    logger.info(`App name/slug ${name}/${slug}`);

    const editCommentBy = `${slug}[bot]`;
    logger.info(`Bot slug: ${editCommentBy}`);

    const comments = await context.octokit.issues.listComments({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issue_number,
      since: reply_to.created_at,
      per_page: 30,
    });

    const comment_to_edit = comments.data.find((comment) => {
      return comment?.user?.login == editCommentBy && comment.id > reply_to.id;
    });

    if (comment_to_edit) {
      logger.info(`For comment_id: ${reply_to.id} found comment_to_edit with id: ${comment_to_edit.id}`);
      await context.octokit.issues.updateComment({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        comment_id: comment_to_edit.id,
        body: msg,
      });
    } else {
      logger.info(`Falling back to add comment. Couldn't find response to edit for comment_id: ${reply_to.id}`);
      await addCommentToIssue(msg, issue_number);
    }
  } catch (e: unknown) {
    logger.debug(`Updating a comment failed! reason: ${e}`);
  }
}

export async function upsertCommentToIssue(issue_number: number, comment: string, action: string, reply_to?: Comment) {
  if (action == "edited" && reply_to) {
    await updateCommentOfIssue(comment, issue_number, reply_to);
  } else {
    await addCommentToIssue(comment, issue_number);
  }
}

export async function getCommentsOfIssue(issue_number: number): Promise<Comment[]> {
  const context = getBotContext();

  const payload = context.payload as Payload;

  let result: Comment[] = [];
  try {
    const response = await context.octokit.rest.issues.listComments({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
    });

    if (response.data) result = response.data as Comment[];
  } catch (e: unknown) {
    logger.debug(`Listing issue comments failed! reason: ${e}`);
  }

  return result;
}

export async function getIssueDescription(
  issue_number: number,
  format: "raw" | "html" | "text" = "raw"
): Promise<string> {
  const context = getBotContext();

  const payload = context.payload as Payload;

  let result = "";
  try {
    const response = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issue_number,
      mediaType: {
        format,
      },
    });

    await checkRateLimitGit(response?.headers);
    switch (format) {
      case "raw":
        result = response.data.body ?? "";
        break;
      case "html":
        result = response.data.body_html ?? "";
        break;
      case "text":
        result = response.data.body_text ?? "";
        break;
    }
  } catch (e: unknown) {
    logger.debug(`Getting issue description failed! reason: ${e}`);
  }
  return result;
}

export async function getAllIssueComments(
  issue_number: number,
  format: "raw" | "html" | "text" | "full" = "raw"
): Promise<Comment[]> {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const result: Comment[] = [];
  let shouldFetch = true;
  let page_number = 1;
  try {
    while (shouldFetch) {
      const response = await context.octokit.rest.issues.listComments({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: issue_number,
        per_page: 100,
        page: page_number,
        mediaType: {
          format,
        },
      });

      await checkRateLimitGit(response?.headers);

      // Fixing infinite loop here, it keeps looping even when its an empty array
      if (response?.data?.length > 0) {
        response.data.forEach((item) => result?.push(item as Comment));
        page_number++;
      } else {
        shouldFetch = false;
      }
    }
  } catch (e: unknown) {
    shouldFetch = false;
  }

  return result;
}

export async function getAllIssueAssignEvents(issue_number: number): Promise<AssignEvent[]> {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const result: AssignEvent[] = [];
  let shouldFetch = true;
  let page_number = 1;
  try {
    while (shouldFetch) {
      const response = await context.octokit.rest.issues.listEvents({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: issue_number,
        per_page: 100,
        page: page_number,
      });

      await checkRateLimitGit(response?.headers);

      // Fixing infinite loop here, it keeps looping even when its an empty array
      if (response?.data?.length > 0) {
        response.data.filter((item) => item.event === "assigned").forEach((item) => result?.push(item as AssignEvent));
        page_number++;
      } else {
        shouldFetch = false;
      }
    }
  } catch (e: unknown) {
    shouldFetch = false;
  }

  return result.sort((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? -1 : 1));
}

export async function wasIssueReopened(issue_number: number): Promise<boolean> {
  const context = getBotContext();
  const payload = context.payload as Payload;

  let shouldFetch = true;
  let page_number = 1;
  try {
    while (shouldFetch) {
      const response = await context.octokit.rest.issues.listEvents({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: issue_number,
        per_page: 100,
        page: page_number,
      });

      await checkRateLimitGit(response?.headers);

      // Fixing infinite loop here, it keeps looping even when its an empty array
      if (response?.data?.length > 0) {
        if (response.data.filter((item) => item.event === "reopened").length > 0) return true;
        page_number++;
      } else {
        shouldFetch = false;
      }
    }
  } catch (e: unknown) {
    shouldFetch = false;
  }

  return false;
}

export async function removeAssignees(issue_number: number, assignees: string[]): Promise<void> {
  const context = getBotContext();

  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.removeAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      assignees,
    });
  } catch (e: unknown) {
    logger.debug(`Removing assignees failed! reason: ${e}`);
  }
}

export async function checkUserPermissionForRepoAndOrg(username: string, context: Context): Promise<boolean> {
  const permissionForRepo = await checkUserPermissionForRepo(username, context);
  const permissionForOrg = await checkUserPermissionForOrg(username, context);
  const userPermission = await isUserAdminOrBillingManager(username, context);

  return permissionForOrg || permissionForRepo || userPermission === "admin";
}

export async function checkUserPermissionForRepo(username: string, context: Context): Promise<boolean> {
  const payload = context.payload as Payload;

  try {
    const res = await context.octokit.rest.repos.checkCollaborator({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      username,
    });

    return res.status === 204;
  } catch (e: unknown) {
    logger.error(`Checking if user permisson for repo failed! reason: ${e}`);
    return false;
  }
}

export async function checkUserPermissionForOrg(username: string, context: Context): Promise<boolean> {
  const payload = context.payload as Payload;
  if (!payload.organization) return false;

  try {
    await context.octokit.rest.orgs.checkMembershipForUser({
      org: payload.organization.login,
      username,
    });
    // skipping status check due to type error of checkMembershipForUser function of octokit
    return true;
  } catch (e: unknown) {
    logger.error(`Checking if user permisson for org failed! reason: ${e}`);
    return false;
  }
}

export async function isUserAdminOrBillingManager(
  username: string,
  context: Context
): Promise<"admin" | "billing_manager" | false> {
  const payload = context.payload as Payload;

  const isAdmin = await checkIfIsAdmin();
  if (isAdmin) return "admin";

  const isBillingManager = await checkIfIsBillingManager();
  if (isBillingManager) return "billing_manager";

  return false;

  async function checkIfIsAdmin() {
    const response = await context.octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      username,
    });

    if (response.status === 200) {
      return response.data.permission as "admin" | "write" | "read" | "none";
    } else {
      return null;
    }
  }

  async function checkIfIsBillingManager() {
    if (!payload.organization) throw logger.error(`No organization found in payload!`);
    const { data: membership } = await context.octokit.rest.orgs.getMembershipForUser({
      org: payload.organization.login,
      username: payload.repository.owner.login,
    });

    if (membership.role === "billing_manager") {
      return true;
    } else {
      return false;
    }
  }
}

export async function addAssignees(issue_number: number, assignees: string[]): Promise<void> {
  const context = getBotContext();

  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.addAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      assignees,
    });
  } catch (e: unknown) {
    logger.debug(`Adding assignees failed! reason: ${e}`);
  }
}

export async function deleteLabel(label: string): Promise<void> {
  const context = getBotContext();

  const payload = context.payload as Payload;

  try {
    const response = await context.octokit.rest.search.issuesAndPullRequests({
      q: `repo:${payload.repository.owner.login}/${payload.repository.name} label:"${label}" state:open`,
    });
    if (response.data.items.length === 0) {
      //remove label
      await context.octokit.rest.issues.deleteLabel({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        name: label,
      });
    }
  } catch (e: unknown) {
    logger.debug(`Label deletion failed! reason: ${e}`);
  }
}

export async function removeLabel(name: string) {
  const context = getBotContext();

  const payload = context.payload as Payload;
  if (!payload.issue) {
    logger.debug("Invalid issue object");
    return;
  }

  try {
    await context.octokit.issues.removeLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      name: name,
    });
  } catch (e: unknown) {
    logger.debug(`Label removal failed! reason: ${e}`);
  }
}

export async function getAllPullRequests(context: Context, state: "open" | "closed" | "all" = "open") {
  const prArr = [];
  let fetchDone = false;
  const perPage = 100;
  let curPage = 1;
  while (!fetchDone) {
    const prs = await getPullRequests(context, state, perPage, curPage);

    // push the objects to array
    prArr.push(...prs);

    if (prs.length < perPage) fetchDone = true;
    else curPage++;
  }
  return prArr;
}
// Use `context.octokit.rest` to get the pull requests for the repository
export async function getPullRequests(
  context: Context,
  state: "open" | "closed" | "all" = "open",
  per_page: number,
  page: number
) {
  const payload = context.payload as Payload;
  try {
    const { data: pulls } = await context.octokit.rest.pulls.list({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state,
      per_page,
      page,
    });
    return pulls;
  } catch (e: unknown) {
    logger.debug(`Fetching pull requests failed! reason: ${e}`);
    return [];
  }
}

export async function closePullRequest(pull_number: number) {
  const context = getBotContext();
  const payload = context.payload as Payload;

  try {
    await getBotContext().octokit.rest.pulls.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number,
      state: "closed",
    });
  } catch (e: unknown) {
    logger.debug(`Closing pull requests failed! reason: ${e}`);
  }
}

export async function getAllPullRequestReviews(
  context: Context,
  pull_number: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) {
  const prArr = [];
  let fetchDone = false;
  const perPage = 30;
  let curPage = 1;
  while (!fetchDone) {
    const prs = await getPullRequestReviews(context, pull_number, perPage, curPage, format);

    // push the objects to array
    prArr.push(...prs);

    if (prs.length < perPage) fetchDone = true;
    else curPage++;
  }
  return prArr;
}

export async function getPullRequestReviews(
  context: Context,
  pull_number: number,
  per_page: number,
  page: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) {
  const payload = context.payload as Payload;
  try {
    const { data: reviews } = await context.octokit.rest.pulls.listReviews({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number,
      per_page,
      page,
      mediaType: {
        format,
      },
    });
    return reviews;
  } catch (e: unknown) {
    logger.debug(`Fetching pull request reviews failed! reason: ${e}`);
    return [];
  }
}

export async function getReviewRequests(context: Context, pull_number: number, owner: string, repo: string) {
  try {
    const response = await context.octokit.pulls.listRequestedReviewers({
      owner: owner,
      repo: repo,
      pull_number: pull_number,
    });
    return response.data;
  } catch (e: unknown) {
    logger.error(`Could not get requested reviewers, reason: ${e}`);
    return null;
  }
}
// Get issues by issue number
export async function getIssueByNumber(context: Context, issue_number: number) {
  const payload = context.payload as Payload;
  try {
    const { data: issue } = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
    });
    return issue;
  } catch (e: unknown) {
    logger.debug(`Fetching issue failed! reason: ${e}`);
    return;
  }
}

export async function getPullByNumber(context: Context, pull_number: number) {
  const payload = context.payload as Payload;
  try {
    const { data: pull } = await context.octokit.rest.pulls.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number,
    });
    return pull;
  } catch (error) {
    logger.debug(`Fetching pull failed! reason: ${error}`);
    return;
  }
}

// Get issues assigned to a username
export async function getAssignedIssues(username: string) {
  const issuesArr = [];
  let fetchDone = false;
  const perPage = 30;
  let curPage = 1;
  while (!fetchDone) {
    const issues = await listIssuesForRepo(IssueType.OPEN, perPage, curPage);

    // push the objects to array
    issuesArr.push(...issues);

    if (issues.length < perPage) fetchDone = true;
    else curPage++;
  }

  // get only issues assigned to username
  const assigned_issues = issuesArr.filter(
    (issue) => !issue.pull_request && issue.assignee && issue.assignee.login === username
  );

  return assigned_issues;
}

export async function getOpenedPullRequestsForAnIssue(issueNumber: number, userName: string) {
  const pulls = await getOpenedPullRequests(userName);

  return pulls.filter((pull) => {
    if (!pull.body) return false;
    const issues = pull.body.match(/#(\d+)/gi);

    if (!issues) return false;

    const linkedIssueNumbers = Array.from(new Set(issues.map((issue) => issue.replace("#", ""))));
    if (linkedIssueNumbers.indexOf(`${issueNumber}`) !== -1) return true;
    return false;
  });
}

export async function getOpenedPullRequests(username: string) {
  const context = getBotContext();
  const prs = await getAllPullRequests(context, "open");
  return prs.filter((pr) => !pr.draft && (pr.user?.login === username || !username));
}

export async function getCommitsOnPullRequest(pullNumber: number) {
  const context = getBotContext();
  const payload = getBotContext().payload as Payload;
  try {
    const { data: commits } = await context.octokit.rest.pulls.listCommits({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pullNumber,
    });
    return commits;
  } catch (e: unknown) {
    logger.debug(`Fetching pull request commits failed! reason: ${e}`);
    return [];
  }
}

export async function getAvailableOpenedPullRequests(username: string) {
  const context = getBotContext();
  const {
    unassign: { timeRangeForMaxIssue, timeRangeForMaxIssueEnabled },
  } = await getBotConfig();
  if (!timeRangeForMaxIssueEnabled) return [];

  const opened_prs = await getOpenedPullRequests(username);

  const result = [];

  for (let i = 0; i < opened_prs.length; i++) {
    const pr = opened_prs[i];
    const reviews = await getAllPullRequestReviews(context, pr.number);

    if (reviews.length > 0) {
      const approvedReviews = reviews.find((review) => review.state === "APPROVED");
      if (approvedReviews) result.push(pr);
    }

    if (
      reviews.length === 0 &&
      (new Date().getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60) >= timeRangeForMaxIssue
    ) {
      result.push(pr);
    }
  }
  return result;
}

// Strips out all links from the body of an issue or pull request and fetches the conversational context from each linked issue or pull request
export async function getAllLinkedIssuesAndPullsInBody(issueNumber: number) {
  const context = getBotContext();

  const issue = await getIssueByNumber(context, issueNumber);

  if (!issue) {
    return `Failed to fetch using issueNumber: ${issueNumber}`;
  }

  if (!issue.body) {
    return `No body found for issue: ${issueNumber}`;
  }

  const body = issue.body;
  const linkedPRStreamlined: StreamlinedComment[] = [];
  const linkedIssueStreamlined: StreamlinedComment[] = [];

  const regex = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+)/gi;
  const matches = body.match(regex);

  if (matches) {
    try {
      const linkedIssues: number[] = [];
      const linkedPrs: number[] = [];

      // this finds refs via all patterns: #<issue number>, full url or [#25](url.to.issue)
      const issueRef = issue.body.match(/(#(\d+)|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+))/gi);

      // if they exist, strip out the # or the url and push them to their arrays
      if (issueRef) {
        issueRef.forEach((issue) => {
          if (issue.includes("#")) {
            linkedIssues.push(Number(issue.slice(1)));
          } else {
            if (issue.split("/")[5] == "pull") {
              linkedPrs.push(Number(issue.split("/")[6]));
            } else linkedIssues.push(Number(issue.split("/")[6]));
          }
        });
      } else {
        logger.info(`No linked issues or prs found`);
      }

      if (linkedPrs.length > 0) {
        for (let i = 0; i < linkedPrs.length; i++) {
          const pr = await getPullByNumber(context, linkedPrs[i]);
          if (pr) {
            linkedPRStreamlined.push({
              login: "system",
              body: `=============== Pull Request #${pr.number}: ${pr.title} + ===============\n ${pr.body}}`,
            });
            const prComments = await getAllIssueComments(linkedPrs[i]);
            const prCommentsRaw = await getAllIssueComments(linkedPrs[i], "raw");
            prComments.forEach(async (comment, i) => {
              if (
                comment.user.type == UserType.User ||
                prCommentsRaw[i].body.includes("<!--- { 'UbiquiBot': 'answer' } --->")
              ) {
                linkedPRStreamlined.push({
                  login: comment.user.login,
                  body: comment.body,
                });
              }
            });
          }
        }
      }

      if (linkedIssues.length > 0) {
        for (let i = 0; i < linkedIssues.length; i++) {
          const issue = await getIssueByNumber(context, linkedIssues[i]);
          if (issue) {
            linkedIssueStreamlined.push({
              login: "system",
              body: `=============== Issue #${issue.number}: ${issue.title} + ===============\n ${issue.body} `,
            });
            const issueComments = await getAllIssueComments(linkedIssues[i]);
            const issueCommentsRaw = await getAllIssueComments(linkedIssues[i], "raw");
            issueComments.forEach(async (comment, i) => {
              if (
                comment.user.type == UserType.User ||
                issueCommentsRaw[i].body.includes("<!--- { 'UbiquiBot': 'answer' } --->")
              ) {
                linkedIssueStreamlined.push({
                  login: comment.user.login,
                  body: comment.body,
                });
              }
            });
          }
        }
      }

      return {
        linkedIssues: linkedIssueStreamlined,
        linkedPrs: linkedPRStreamlined,
      };
    } catch (error) {
      logger.info(`Error getting linked issues or prs: ${error}`);
      return `Error getting linked issues or prs: ${error}`;
    }
  } else {
    logger.info(`No matches found`);
    return {
      linkedIssues: [],
      linkedPrs: [],
    };
  }
}
