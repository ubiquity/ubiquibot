import { Context } from "probot";
import {
  AssignEvent,
  Comment,
  HandlerReturnValuesNoVoid,
  Issue,
  IssueType,
  Payload,
  StreamlinedComment,
  UserType,
} from "../types";
import { checkRateLimitGit } from "../utils";
import Runtime from "../bindings/bot-runtime";
import { LogReturn } from "../adapters/supabase";

type PromiseType<T> = T extends Promise<infer U> ? U : never;

async function getAllIssueEvents() {
  type Event = PromiseType<ReturnType<typeof context.octokit.issues.listEvents>>["data"][0];
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

  const payload = context.payload as Payload;
  if (!payload.issue) return;

  let shouldFetch = true;
  let page = 1;

  const events = [] as Event[];

  while (shouldFetch) {
    // Fetch issue events

    const repo = payload.repository.name;
    const owner = payload.repository.owner.login;

    const response = await context.octokit.issues.listEvents({
      owner: owner,
      repo: repo,
      issue_number: payload.issue.number,
      per_page: 100,
      page: page,
    });

    await checkRateLimitGit(response?.headers);

    if (response.data.length > 0) {
      events.push(...(response.data as Event[]));
      page++;
    } else {
      shouldFetch = false;
    }
  }

  return events;
}

export async function getAllLabeledEvents() {
  const events = await getAllIssueEvents();
  if (!events) return null;
  return events.filter((event) => event.event === "labeled");
}

export async function clearAllPriceLabelsOnIssue() {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

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
    runtime.logger.debug("Clearing all price labels failed!", e);
  }
}

export async function addLabelToIssue(labelName: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

  const payload = context.payload as Payload;
  if (!payload.issue) {
    throw runtime.logger.error("Issue object is null");
  }

  try {
    await context.octokit.issues.addLabels({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      labels: [labelName],
    });
  } catch (e: unknown) {
    runtime.logger.debug("Adding a label to issue failed!", e);
  }
}

async function listIssuesForRepo(
  state: "open" | "closed" | "all" = "open",
  per_page = 100,
  page = 1,
  sort: "created" | "updated" | "comments" = "created",
  direction: "desc" | "asc" = "desc"
) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
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
  const issuesArr = [] as Issue[];
  const perPage = 100;
  let fetchDone = false;
  let curPage = 1;
  while (!fetchDone) {
    const issues = (await listIssuesForRepo(state, perPage, curPage)) as Issue[];

    // push the objects to array
    issuesArr.push(...issues);

    if (issues.length < perPage) fetchDone = true;
    else curPage++;
  }

  return issuesArr;
}

export async function addCommentToIssue(message: HandlerReturnValuesNoVoid, issueNumber: number) {
  let comment = message as string;
  const runtime = Runtime.getState();
  if (message instanceof LogReturn) {
    comment = message.logMessage.diff;
  }
  const context = runtime.eventContext;

  const payload = context.payload as Payload;

  try {
    await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
      body: comment,
    });
  } catch (e: unknown) {
    runtime.logger.error("Adding a comment failed!", e);
  }
}

export async function upsertLastCommentToIssue(issue_number: number, commentBody: string) {
  const runtime = Runtime.getState();

  try {
    const comments = await getAllIssueComments(issue_number);

    if (comments.length > 0 && comments[comments.length - 1].body !== commentBody)
      await addCommentToIssue(commentBody, issue_number);
  } catch (e: unknown) {
    runtime.logger.debug("Upserting last comment failed!", e);
  }
}

export async function getIssueDescription(
  issueNumber: number,
  format: "raw" | "html" | "text" = "raw"
): Promise<string> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

  const payload = context.payload as Payload;

  const response = await context.octokit.rest.issues.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: issueNumber,
    mediaType: {
      format,
    },
  });

  await checkRateLimitGit(response?.headers);

  let result = response.data.body;

  if (format === "html") {
    result = response.data.body_html;
  } else if (format === "text") {
    result = response.data.body_text;
  }

  if (!result) {
    throw runtime.logger.error("Issue description is empty");
  }

  return result;
}

export async function getAllIssueComments(
  issueNumber: number,
  format: "raw" | "html" | "text" | "full" = "raw"
): Promise<Comment[]> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;

  const result: Comment[] = [];
  let shouldFetch = true;
  let page_number = 1;
  try {
    while (shouldFetch) {
      const response = await context.octokit.rest.issues.listComments({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: issueNumber,
        per_page: 100,
        page: page_number,
        mediaType: {
          format,
        },
      });

      await checkRateLimitGit(response?.headers);

      // Fixing infinite loop here, it keeps looping even when its an empty array
      if (response?.data?.length > 0) {
        response.data.forEach((item) => {
          result.push(item as Comment);
        });
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

export async function getAllIssueAssignEvents(issueNumber: number): Promise<AssignEvent[]> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;

  const result: AssignEvent[] = [];
  let shouldFetch = true;
  let page_number = 1;
  try {
    while (shouldFetch) {
      const response = await context.octokit.rest.issues.listEvents({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: issueNumber,
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

export async function wasIssueReopened(issueNumber: number): Promise<boolean> {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;

  let shouldFetch = true;
  let page_number = 1;
  try {
    while (shouldFetch) {
      const response = await context.octokit.rest.issues.listEvents({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: issueNumber,
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

export async function removeAssignees(issueNumber: number, assignees: string[]) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.removeAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
      assignees,
    });
  } catch (e: unknown) {
    runtime.logger.debug("Removing assignees failed!", e);
  }
}

export async function checkUserPermissionForRepoAndOrg(username: string, context: Context): Promise<boolean> {
  const permissionForRepo = await checkUserPermissionForRepo(username, context);
  const permissionForOrg = await checkUserPermissionForOrg(username, context);
  const userPermission = await isUserAdminOrBillingManager(username, context);

  return permissionForOrg || permissionForRepo || userPermission === "admin";
}

async function checkUserPermissionForRepo(username: string, context: Context): Promise<boolean> {
  const runtime = Runtime.getState();

  const payload = context.payload as Payload;

  try {
    const res = await context.octokit.rest.repos.checkCollaborator({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      username,
    });

    return res.status === 204;
  } catch (e: unknown) {
    runtime.logger.error("Checking if user permisson for repo failed!", e);
    return false;
  }
}

async function checkUserPermissionForOrg(username: string, context: Context): Promise<boolean> {
  const runtime = Runtime.getState();

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
    runtime.logger.error("Checking if user permisson for org failed!", e);
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
    if (response.data.permission === "admin") {
      return true;
    } else {
      return false;
    }
  }

  async function checkIfIsBillingManager() {
    const runtime = Runtime.getState();

    if (!payload.organization) throw runtime.logger.error(`No organization found in payload!`);
    const { data: membership } = await context.octokit.rest.orgs.getMembershipForUser({
      org: payload.organization.login,
      username: payload.repository.owner.login,
    });

    console.trace(membership);
    if (membership.role === "billing_manager") {
      return true;
    } else {
      return false;
    }
  }
}

export async function addAssignees(issue: number, assignees: string[]) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.issues.addAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issue,
      assignees,
    });
  } catch (e: unknown) {
    runtime.logger.debug("Adding assignees failed!", e);
  }
}

export async function deleteLabel(label: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

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
    runtime.logger.debug("Deleting label failed!", e);
  }
}

export async function removeLabel(name: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

  const payload = context.payload as Payload;
  if (!payload.issue) {
    runtime.logger.debug("Invalid issue object");
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
    runtime.logger.debug("Removing label failed!", e);
  }
}

export async function getAllPullRequests(context: Context, state: "open" | "closed" | "all" = "open") {
  type Pulls = PromiseType<ReturnType<typeof context.octokit.rest.pulls.list>>["data"][0];
  const prArr = [] as Pulls[];
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
async function getPullRequests(
  context: Context,
  state: "open" | "closed" | "all" = "open",
  per_page: number,
  page: number
) {
  const payload = context.payload as Payload;
  const { data: pulls } = await context.octokit.rest.pulls.list({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    per_page,
    page,
  });
  return pulls;
}

export async function closePullRequest(pull_number: number) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = context.payload as Payload;

  try {
    await context.octokit.rest.pulls.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number,
      state: "closed",
    });
  } catch (e: unknown) {
    runtime.logger.debug("Closing pull requests failed!", e);
  }
}

export async function getAllPullRequestReviews(
  context: Context,
  pull_number: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) {
  type Reviews = PromiseType<ReturnType<typeof context.octokit.rest.pulls.listReviews>>["data"][0];
  const prArr = [] as Reviews[];
  let fetchDone = false;
  const perPage = 100;
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

async function getPullRequestReviews(
  context: Context,
  pull_number: number,
  per_page: number,
  page: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) {
  const runtime = Runtime.getState();

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
    runtime.logger.debug("Fetching pull request reviews failed!", e);
    return [];
  }
}

export async function getReviewRequests(context: Context, pull_number: number, owner: string, repo: string) {
  const runtime = Runtime.getState();

  try {
    const response = await context.octokit.pulls.listRequestedReviewers({
      owner: owner,
      repo: repo,
      pull_number: pull_number,
    });
    return response.data;
  } catch (e: unknown) {
    runtime.logger.error("Could not get requested reviewers", e);
    return null;
  }
}
// Get issues by issue number
export async function getIssueByNumber(context: Context, issueNumber: number) {
  const runtime = Runtime.getState();

  const payload = context.payload as Payload;
  try {
    const { data: issue } = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
    });
    return issue;
  } catch (e: unknown) {
    runtime.logger.debug("Fetching issue failed!", e);
    return;
  }
}

export async function getPullByNumber(context: Context, pull: number) {
  // const runtime = Runtime.getState();

  const payload = context.payload as Payload;
  const response = await context.octokit.rest.pulls.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: pull,
  });
  return response.data;
}

// Get issues assigned to a username
export async function getAssignedIssues(username: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  type Issues = PromiseType<ReturnType<typeof context.octokit.issues.listForRepo>>["data"][0];
  const issuesArr = [] as Issues[];
  let fetchDone = false;
  const perPage = 100;
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

async function getOpenedPullRequests(username: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const prs = await getAllPullRequests(context, "open");
  return prs.filter((pr) => !pr.draft && (pr.user?.login === username || !username));
}

export async function getCommitsOnPullRequest(pullNumber: number) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const payload = runtime.eventContext.payload as Payload;
  try {
    const { data: commits } = await context.octokit.rest.pulls.listCommits({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pullNumber,
    });
    return commits;
  } catch (e: unknown) {
    runtime.logger.debug("Fetching pull request commits failed!", e);
    return [];
  }
}

export async function getAvailableOpenedPullRequests(username: string) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;

  const unassignConfig = runtime.botConfig.unassign;
  const { timeRangeForMaxIssue } = unassignConfig;
  if (!timeRangeForMaxIssue) return [];

  const openedPullRequests = await getOpenedPullRequests(username);
  const result = [] as typeof openedPullRequests;

  for (let i = 0; i < openedPullRequests.length; i++) {
    const openedPullRequest = openedPullRequests[i];
    const reviews = await getAllPullRequestReviews(context, openedPullRequest.number);

    if (reviews.length > 0) {
      const approvedReviews = reviews.find((review) => review.state === "APPROVED");
      if (approvedReviews) {
        result.push(openedPullRequest);
      }
    }

    if (
      reviews.length === 0 &&
      (new Date().getTime() - new Date(openedPullRequest.created_at).getTime()) / (1000 * 60 * 60) >=
        timeRangeForMaxIssue
    ) {
      result.push(openedPullRequest);
    }
  }
  return result;
}

// Strips out all links from the body of an issue or pull request and fetches the conversational context from each linked issue or pull request
export async function getAllLinkedIssuesAndPullsInBody(issueNumber: number) {
  const runtime = Runtime.getState();
  const context = runtime.eventContext;
  const logger = runtime.logger;

  const issue = await getIssueByNumber(context, issueNumber);

  if (!issue) {
    throw logger.error("No issue found!", { issueNumber });
  }

  if (!issue.body) {
    throw logger.error("No body found!", { issueNumber });
  }

  const body = issue.body;
  const linkedPRStreamlined: StreamlinedComment[] = [];
  const linkedIssueStreamlined: StreamlinedComment[] = [];

  const regex = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+)/gi;
  const matches = body.match(regex);

  if (matches) {
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
      runtime.logger.info(`No linked issues or prs found`);
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
  } else {
    runtime.logger.info(`No matches found`);
    return {
      linkedIssues: [],
      linkedPrs: [],
    };
  }
}
