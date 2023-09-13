import { Context } from "probot";
import { getBotConfig, getBotContext, getLogger } from "../bindings";
import { AssignEvent, Comment, IssueType, Payload } from "../types";
import { checkRateLimitGit } from "../utils";

export const clearAllPriceLabelsOnIssue = async (): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
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
    logger.debug(`Clearing all price labels failed!, reason: ${e}`);
  }
};

export const addLabelToIssue = async (labelName: string) => {
  const context = getBotContext();
  const logger = getLogger();
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
    logger.debug(`Adding a label to issue failed!, reason: ${e}`);
  }
};

export const listIssuesForRepo = async (
  state: "open" | "closed" | "all" = "open",
  per_page = 30,
  page = 1,
  sort: "created" | "updated" | "comments" = "created",
  direction: "desc" | "asc" = "desc"
) => {
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
};

export const listAllIssuesForRepo = async (state: "open" | "closed" | "all" = "open") => {
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
};

export const addCommentToIssue = async (msg: string, issue_number: number) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  try {
    await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      body: msg,
    });
  } catch (e: unknown) {
    logger.debug(`Adding a comment failed!, reason: ${e}`);
  }
};

export const updateCommentOfIssue = async (msg: string, issue_number: number, reply_to: Comment) => {
  const context = getBotContext();
  const logger = getLogger();
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
    logger.debug(`Upading a comment failed!, reason: ${e}`);
  }
};

export const upsertCommentToIssue = async (issue_number: number, comment: string, action: string, reply_to?: Comment) => {
  if (action == "edited" && reply_to) {
    await updateCommentOfIssue(comment, issue_number, reply_to);
  } else {
    await addCommentToIssue(comment, issue_number);
  }
};

export const getCommentsOfIssue = async (issue_number: number): Promise<Comment[]> => {
  const context = getBotContext();
  const logger = getLogger();
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
    logger.debug(`Listing issue comments failed!, reason: ${e}`);
  }

  return result;
};

export const getIssueDescription = async (issue_number: number, format: "raw" | "html" | "text" = "raw"): Promise<string> => {
  const context = getBotContext();
  const logger = getLogger();
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
    logger.debug(`Getting issue description failed!, reason: ${e}`);
  }
  return result;
};

export const getAllIssueComments = async (issue_number: number, format: "raw" | "html" | "text" | "full" = "raw"): Promise<Comment[]> => {
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
};

export const getAllIssueAssignEvents = async (issue_number: number): Promise<AssignEvent[]> => {
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
};

export const wasIssueReopened = async (issue_number: number): Promise<boolean> => {
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
};

export const removeAssignees = async (issue_number: number, assignees: string[]): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.removeAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      assignees,
    });
  } catch (e: unknown) {
    logger.debug(`Removing assignees failed!, reason: ${e}`);
  }
};

export const checkUserPermissionForRepoAndOrg = async (username: string, context: Context): Promise<boolean> => {
  const permissionForRepo = await checkUserPermissionForRepo(username, context);
  const permissionForOrg = await checkUserPermissionForOrg(username, context);
  const userPermission = await getUserPermission(username, context);

  return permissionForOrg || permissionForRepo || userPermission === "admin" || userPermission === "billing_manager";
};

export const checkUserPermissionForRepo = async (username: string, context: Context): Promise<boolean> => {
  const logger = getLogger();
  const payload = context.payload as Payload;

  try {
    const res = await context.octokit.rest.repos.checkCollaborator({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      username,
    });

    return res.status === 204;
  } catch (e: unknown) {
    logger.error(`Checking if user permisson for repo failed!, reason: ${e}`);
    return false;
  }
};

export const checkUserPermissionForOrg = async (username: string, context: Context): Promise<boolean> => {
  const logger = getLogger();
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
    logger.error(`Checking if user permisson for org failed!, reason: ${e}`);
    return false;
  }
};

export const getUserPermission = async (username: string, context: Context): Promise<string> => {
  const logger = getLogger();
  const payload = context.payload as Payload;

  try {
    const response = await context.octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      username,
    });

    if (response.status === 200) {
      return response.data.permission;
    } else {
      return "";
    }
  } catch (e: unknown) {
    logger.debug(`Checking if user is admin failed!, reason: ${e}`);
    return "";
  }
};

export const addAssignees = async (issue_number: number, assignees: string[]): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.addAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
      assignees,
    });
  } catch (e: unknown) {
    logger.debug(`Adding assignees failed!, reason: ${e}`);
  }
};

export const deleteLabel = async (label: string): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
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
    logger.debug(`Label deletion failed!, reason: ${e}`);
  }
};

export const removeLabel = async (name: string) => {
  const context = getBotContext();
  const logger = getLogger();
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
    logger.debug(`Label removal failed!, reason: ${e}`);
  }
};

export const getAllPullRequests = async (context: Context, state: "open" | "closed" | "all" = "open") => {
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
};
// Use `context.octokit.rest` to get the pull requests for the repository
export const getPullRequests = async (context: Context, state: "open" | "closed" | "all" = "open", per_page: number, page: number) => {
  const logger = getLogger();
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
    logger.debug(`Fetching pull requests failed!, reason: ${e}`);
    return [];
  }
};

export const closePullRequest = async (pull_number: number) => {
  const context = getBotContext();
  const payload = context.payload as Payload;
  const logger = getLogger();
  try {
    await getBotContext().octokit.rest.pulls.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number,
      state: "closed",
    });
  } catch (e: unknown) {
    logger.debug(`Closing pull requests failed!, reason: ${e}`);
  }
};

export const getAllPullRequestReviews = async (context: Context, pull_number: number, format: "raw" | "html" | "text" | "full" = "raw") => {
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
};

export const getPullRequestReviews = async (
  context: Context,
  pull_number: number,
  per_page: number,
  page: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) => {
  const logger = getLogger();
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
    logger.debug(`Fetching pull request reviews failed!, reason: ${e}`);
    return [];
  }
};

export const getReviewRequests = async (context: Context, pull_number: number, owner: string, repo: string) => {
  const logger = getLogger();
  try {
    const response = await context.octokit.pulls.listRequestedReviewers({
      owner: owner,
      repo: repo,
      pull_number: pull_number,
    });
    return response.data;
  } catch (e: unknown) {
    logger.error(`Error: could not get requested reviewers, reason: ${e}`);
    return null;
  }
};
// Get issues by issue number
export const getIssueByNumber = async (context: Context, issue_number: number) => {
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    const { data: issue } = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number,
    });
    return issue;
  } catch (e: unknown) {
    logger.debug(`Fetching issue failed!, reason: ${e}`);
    return;
  }
};

export const getPullByNumber = async (context: Context, pull_number: number) => {
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    const { data: pull } = await context.octokit.rest.pulls.get({ owner: payload.repository.owner.login, repo: payload.repository.name, pull_number });
    return pull;
  } catch (error) {
    logger.debug(`Fetching pull failed!, reason: ${error}`);
    return;
  }
};

// Get issues assigned to a username
export const getAssignedIssues = async (username: string) => {
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
  const assigned_issues = issuesArr.filter((issue) => !issue.pull_request && issue.assignee && issue.assignee.login === username);

  return assigned_issues;
};

export const getOpenedPullRequestsForAnIssue = async (issueNumber: number, userName: string) => {
  const pulls = await getOpenedPullRequests(userName);

  return pulls.filter((pull) => {
    if (!pull.body) return false;
    const issues = pull.body.match(/#(\d+)/gi);

    if (!issues) return false;

    const linkedIssueNumbers = Array.from(new Set(issues.map((issue) => issue.replace("#", ""))));
    if (linkedIssueNumbers.indexOf(`${issueNumber}`) !== -1) return true;
    return false;
  });
};

export const getOpenedPullRequests = async (username: string) => {
  const context = getBotContext();
  const prs = await getAllPullRequests(context, "open");
  return prs.filter((pr) => !pr.draft && (pr.user?.login === username || !username));
};

export const getCommitsOnPullRequest = async (pullNumber: number) => {
  const logger = getLogger();
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
    logger.debug(`Fetching pull request commits failed!, reason: ${e}`);
    return [];
  }
};

export const getAvailableOpenedPullRequests = async (username: string) => {
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

    if (reviews.length === 0 && (new Date().getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60) >= timeRangeForMaxIssue) {
      result.push(pr);
    }
  }
  return result;
};
