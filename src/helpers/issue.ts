import {
  AssignEvent,
  Comment,
  HandlerReturnValuesNoVoid,
  Issue,
  IssueType,
  StreamlinedComment,
  UserType,
} from "../types";
import { LogReturn } from "../adapters/supabase";
import { Payload, Context } from "../types";

type PromiseType<T> = T extends Promise<infer U> ? U : never;

async function getAllIssueEvents(context: Context) {
  if (!context.payload.issue) return;

  const events = await context.octokit.paginate(context.octokit.issues.listEvents, {
    ...context.event.issue(),
    per_page: 100,
  });

  return events;
}

export async function getAllLabeledEvents(context: Context) {
  const events = await getAllIssueEvents(context);
  if (!events) return null;
  return events.filter((event) => event.event === "labeled");
}

export async function clearAllPriceLabelsOnIssue(context: Context) {
  const payload = context.payload;
  if (!payload.issue) return;

  const labels = payload.issue.labels;
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price: "));

  if (!issuePrices.length) return;

  // try {
  await context.event.octokit.issues.removeLabel({
    ...context.event.issue(),
    name: issuePrices[0].name,
  });
  // } catch (e: unknown) {
  //   context.logger.debug("Clearing all price labels failed!", e);
  // }
}

export async function addLabelToIssue(context: Context, labelName: string) {
  const payload = context.payload;
  if (!payload.issue) {
    throw context.logger.error("Issue object is null");
  }

  try {
    await context.octokit.issues.addLabels({
      ...context.event.issue(),
      labels: [labelName],
    });
  } catch (e: unknown) {
    context.logger.debug("Adding a label to issue failed!", e);
  }
}

async function listIssuesAndPullsForRepo(
  context: Context,
  state: "open" | "closed" | "all" = "open",
  per_page = 100,
  page = 1,
  sort: "created" | "updated" | "comments" = "created",
  direction: "desc" | "asc" = "desc"
) {
  const payload = context.payload;
  const response = await context.octokit.issues.listForRepo({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    per_page,
    page,
    sort,
    direction,
  });

  if (response.status === 200) {
    return response.data;
  } else {
    return [];
  }
}

export async function listAllIssuesAndPullsForRepo(
  context: Context,
  state: "open" | "closed" | "all",
  sort: "created" | "updated" | "comments" = "created",
  direction: "desc" | "asc" = "desc"
) {
  const payload = context.payload;
  const issues = (await context.octokit.paginate(context.octokit.issues.listForRepo, {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    sort,
    direction,
    per_page: 100,
  })) as Issue[];
  return issues;
}

export async function addCommentToIssue(context: Context, message: HandlerReturnValuesNoVoid, issueNumber: number) {
  let comment = message as string;
  if (message instanceof LogReturn) {
    comment = message.logMessage.diff;
    console.trace(
      "one of the places that metadata is being serialized as an html comment. this one is unexpected and serves as a fallback"
    );
    const metadataSerialized = JSON.stringify(message.metadata);
    const metadataSerializedAsComment = `<!-- ${metadataSerialized} -->`;
    comment = comment.concat(metadataSerializedAsComment);
  }

  const payload = context.payload;
  try {
    await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
      body: comment,
    });
  } catch (e: unknown) {
    context.logger.error("Adding a comment failed!", e);
  }
}

export async function upsertLastCommentToIssue(context: Context, issue_number: number, commentBody: string) {
  try {
    const comments = await getAllIssueComments(context, issue_number);

    if (comments.length > 0 && comments[comments.length - 1].body !== commentBody)
      await addCommentToIssue(context, commentBody, issue_number);
  } catch (e: unknown) {
    context.logger.debug("Upserting last comment failed!", e);
  }
}

export async function getIssueDescription(
  context: Context,
  issueNumber: number,
  format: "raw" | "html" | "text" = "raw"
): Promise<string> {
  const payload = context.payload;
  const response = await context.octokit.rest.issues.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: issueNumber,
    mediaType: {
      format,
    },
  });

  let result = response.data.body;

  if (format === "html") {
    result = response.data.body_html;
  } else if (format === "text") {
    result = response.data.body_text;
  }

  if (!result) {
    throw context.logger.error("Issue description is empty");
  }

  return result;
}

export async function getAllIssueComments(
  context: Context,
  issueNumber: number,
  format: "raw" | "html" | "text" | "full" = "raw"
): Promise<Comment[]> {
  const payload = context.payload;

  const comments = (await context.octokit.paginate(context.octokit.rest.issues.listComments, {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: issueNumber,
    per_page: 100,
    mediaType: {
      format,
    },
  })) as Comment[];

  return comments;
}

export async function getAllIssueAssignEvents(context: Context, issueNumber: number): Promise<AssignEvent[]> {
  const payload = context.payload;

  const events = (await context.octokit.paginate(
    context.octokit.issues.listEvents,
    {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
      per_page: 100,
    },
    (response) => response.data.filter((item) => item.event === "assigned")
  )) as AssignEvent[];

  return events.sort((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? -1 : 1));
}

export async function checkUserPermissionForRepoAndOrg(context: Context, username: string): Promise<boolean> {
  const permissionForRepo = await checkUserPermissionForRepo(context, username);
  const permissionForOrg = await checkUserPermissionForOrg(context, username);
  const userPermission = await isUserAdminOrBillingManager(context, username);

  return permissionForOrg || permissionForRepo || userPermission === "admin";
}

async function checkUserPermissionForRepo(context: Context, username: string): Promise<boolean> {
  const payload = context.payload;
  try {
    const res = await context.octokit.rest.repos.checkCollaborator({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      username,
    });

    return res.status === 204;
  } catch (e: unknown) {
    context.logger.error("Checking if user permisson for repo failed!", e);
    return false;
  }
}

async function checkUserPermissionForOrg(context: Context, username: string): Promise<boolean> {
  const payload = context.payload;
  if (!payload.organization) return false;

  try {
    await context.event.octokit.rest.orgs.checkMembershipForUser({
      org: payload.organization.login,
      username,
    });
    // skipping status check due to type error of checkMembershipForUser function of octokit
    return true;
  } catch (e: unknown) {
    context.logger.error("Checking if user permisson for org failed!", e);
    return false;
  }
}

export async function isUserAdminOrBillingManager(
  context: Context,
  username: string
): Promise<"admin" | "billing_manager" | false> {
  const payload = context.payload;
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
    if (!payload.organization) throw context.logger.error(`No organization found in payload!`);
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

export async function addAssignees(context: Context, issue: number, assignees: string[]) {
  const payload = context.payload;
  try {
    await context.octokit.rest.issues.addAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issue,
      assignees,
    });
  } catch (e: unknown) {
    context.logger.debug("Adding assignees failed!", e);
  }
}

export async function deleteLabel(context: Context, label: string) {
  const payload = context.payload;
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
    context.logger.debug("Deleting label failed!", e);
  }
}

export async function removeLabel(context: Context, name: string) {
  const payload = context.payload;
  if (!payload.issue) {
    context.logger.debug("Invalid issue object");
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
    context.logger.debug("Removing label failed!", e);
  }
}

export async function getAllPullRequests(context: Context, state: "open" | "closed" | "all" = "open") {
  const payload = context.payload;

  const pulls = await context.octokit.paginate(context.octokit.rest.pulls.list, {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    per_page: 100,
  });

  return pulls;
}

async function getPullRequests(
  context: Context,
  state: "open" | "closed" | "all" = "open",
  per_page: number,
  page: number
) {
  const payload = context.payload;
  const { data: pulls } = await context.octokit.rest.pulls.list({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    state,
    per_page,
    page,
  });
  return pulls;
}

export async function closePullRequest(context: Context, pull_number: number) {
  const payload = context.payload as Payload;
  try {
    await context.octokit.rest.pulls.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number,
      state: "closed",
    });
  } catch (e: unknown) {
    context.logger.debug("Closing pull requests failed!", e);
  }
}

export async function getAllPullRequestReviews(
  context: Context,
  pull_number: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) {
  const payload = context.payload;
  const reviews = await context.octokit.paginate(context.octokit.rest.pulls.listReviews, {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number,
    per_page: 100,
    mediaType: {
      format,
    },
  });

  return reviews;
}

async function getPullRequestReviews(
  context: Context,
  pull_number: number,
  per_page: number,
  page: number,
  format: "raw" | "html" | "text" | "full" = "raw"
) {
  const payload = context.payload;
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
    context.logger.debug("Fetching pull request reviews failed!", e);
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
    context.logger.error("Could not get requested reviewers", e);
    return null;
  }
}

// Get issues by issue number
export async function getIssueByNumber(context: Context, issueNumber: number) {
  const payload = context.payload;
  try {
    const { data: issue } = await context.octokit.rest.issues.get({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
    });
    return issue;
  } catch (e: unknown) {
    context.logger.debug("Fetching issue failed!", e);
    return;
  }
}

export async function getPullByNumber(context: Context, pull: number) {
  const payload = context.payload;
  const response = await context.octokit.rest.pulls.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: pull,
  });
  return response.data;
}

// Get issues assigned to a username
export async function getAssignedIssues(context: Context, username: string) {
  const payload = context.payload;
  const issues = (await context.octokit.paginate(
    context.octokit.issues.listForRepo,
    {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state: IssueType.OPEN,
      per_page: 1000,
    },
    ({ data: issues }) =>
      issues.filter((issue) => !issue.pull_request && issue.assignee && issue.assignee.login === username)
  )) as Issue[];

  return issues;
}

export async function getOpenedPullRequestsForAnIssue(context: Context, issueNumber: number, userName: string) {
  const pulls = await getOpenedPullRequests(context, userName);

  return pulls.filter((pull) => {
    if (!pull.body) return false;
    const issues = pull.body.match(/#(\d+)/gi);

    if (!issues) return false;

    const linkedIssueNumbers = Array.from(new Set(issues.map((issue) => issue.replace("#", ""))));
    if (linkedIssueNumbers.indexOf(`${issueNumber}`) !== -1) return true;
    return false;
  });
}

async function getOpenedPullRequests(context: Context, username: string) {
  const prs = await getAllPullRequests(context, "open");
  return prs.filter((pr) => !pr.draft && (pr.user?.login === username || !username));
}

export async function getAvailableOpenedPullRequests(context: Context, username: string) {
  const { reviewDelayTolerance } = context.config.timers;
  if (!reviewDelayTolerance) return [];

  const openedPullRequests = await getOpenedPullRequests(context, username);
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
        reviewDelayTolerance
    ) {
      result.push(openedPullRequest);
    }
  }
  return result;
}

// Strips out all links from the body of an issue or pull request and fetches the conversational context from each linked issue or pull request
export async function getAllLinkedIssuesAndPullsInBody(context: Context, issueNumber: number) {
  const logger = context.logger;

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
          const prComments = await getAllIssueComments(context, linkedPrs[i]);
          const prCommentsRaw = await getAllIssueComments(context, linkedPrs[i], "raw");
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
          const issueComments = await getAllIssueComments(context, linkedIssues[i]);
          const issueCommentsRaw = await getAllIssueComments(context, linkedIssues[i], "raw");
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
    logger.info(`No matches found`);
    return {
      linkedIssues: [],
      linkedPrs: [],
    };
  }
}
