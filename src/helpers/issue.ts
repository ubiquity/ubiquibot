import { Context } from "probot";
import { getBotContext, getLogger } from "../bindings";
import { Comment, IssueType, Payload } from "../types";
import { checkRateLimitGit } from "../utils";

export const clearAllPriceLabelsOnIssue = async (): Promise<void> => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  const labels = payload.issue!.labels;
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price:"));

  if (!issuePrices.length) return;

  try {
    await context.octokit.issues.removeLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue!.number,
      name: issuePrices[0].name.toString(),
    });
  } catch (e: unknown) {
    logger.debug(`Clearing all price labels failed!, reason: ${(e as any)?.message}`);
  }
};

export const addLabelToIssue = async (labelName: string) => {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;

  try {
    await context.octokit.issues.addLabels({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue!.number,
      labels: [labelName],
    });
  } catch (e: unknown) {
    logger.debug(`Adding a label to issue failed!, reason: ${(e as any)?.message}`);
  }
};

export const listIssuesForRepo = async (state: "open" | "closed" | "all" = "open", per_page: number = 30, page: number = 1) => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  const response = await context.octokit.issues.listForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    per_page,
    page,
  });

  if (response.status === 200) {
    return response.data;
  } else {
    return [];
  }
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

export const getIssueDescription = async (issue_number: number): Promise<string> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  let result = "";
  try {
    const response = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issue_number,
    });

    await checkRateLimitGit(response?.headers);
    if (response.data.body) result = response.data.body;
  } catch (e: unknown) {}
  return result;
};

export const getAllIssueComments = async (issue_number: number): Promise<Comment[]> => {
  const context = getBotContext();
  const payload = context.payload as Payload;

  let result: Comment[] = [];
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
      });

      await checkRateLimitGit(response?.headers);

      // Fixing infinite loop here, it keeps looping even when its an empty array
      if (response?.data?.length > 0) {
        response.data.forEach((item) => result!.push(item as Comment));
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

  try {
    await context.octokit.issues.removeLabel({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue!.number,
      name: name,
    });
  } catch (e: unknown) {
    logger.debug(`Label removal failed!, reason: ${e}`);
  }
};

// Use `context.octokit.rest` to get the pull requests for the repository
export const getPullRequests = async (context: Context, state: "open" | "closed" | "all" = "open") => {
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    const { data: pulls } = await context.octokit.rest.pulls.list({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state,
    });
    return pulls;
  } catch (e: unknown) {
    logger.debug(`Fetching pull requests failed!, reason: ${e}`);
    return [];
  }
};

export const getAllPullRequestReviews = async (context: Context, pull_number: number) => {
  let prArr = [];
  let fetchDone = false;
  const perPage = 30;
  let curPage = 1;
  while (!fetchDone) {
    const prs = await getPullRequestReviews(context, pull_number, perPage, curPage);

    // push the objects to array
    prArr.push(...prs);

    if (prs.length < perPage) fetchDone = true;
    else curPage++;
  }
  return prArr;
};

export const getPullRequestReviews = async (context: Context, pull_number: number, per_page: number, page: number) => {
  const logger = getLogger();
  const payload = context.payload as Payload;
  try {
    const { data: reviews } = await context.octokit.rest.pulls.listReviews({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number,
      per_page,
      page,
    });
    return reviews;
  } catch (e: unknown) {
    logger.debug(`Fetching pull request reviews failed!, reason: ${e}`);
    return [];
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

// Get issues assigned to a username
export const getAssignedIssues = async (username: string) => {
  let issuesArr = [];
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

export const getLast24HoursOpenedPullRequestsWithNoReviews = async (username: string) => {
  const context = getBotContext();
  const prs = await getPullRequests(context, "open");
  const opened_prs = [];
  for (let i = 0; i < prs.length; i++) {
    const pr = prs[i];
    if (pr.draft) continue;
    if (pr.user?.login !== username) continue;
    const reviews = await getAllPullRequestReviews(context, pr.number);
    if (reviews.length > 0 || (reviews.length === 0 && (new Date().getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60) >= 0)) {
      opened_prs.push(pr);
    }
  }
  return opened_prs;
};
