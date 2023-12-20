import { LogReturn } from "../adapters/supabase/helpers/tables/logs";
import { Context } from "../types/context";
import { HandlerReturnValuesNoVoid } from "../types/handlers";
import { GitHubComment } from "../types/payload";

export async function clearAllPriceLabelsOnIssue(context: Context) {
  const payload = context.payload;
  if (!payload.issue) return;

  const labels = payload.issue.labels;
  const issuePrices = labels.filter((label) => label.name.toString().startsWith("Price: "));

  if (!issuePrices.length) return;

  try {
    await context.event.octokit.issues.removeLabel({
      ...context.event.issue(),
      name: issuePrices[0].name,
    });
  } catch (e: unknown) {
    context.logger.fatal("Clearing all price labels failed!", e);
  }
}

export async function addLabelToIssue(context: Context, labelName: string) {
  const payload = context.payload;
  if (!payload.issue) {
    throw context.logger.fatal("Issue object is null");
  }

  try {
    await context.octokit.issues.addLabels({
      ...context.event.issue(),
      labels: [labelName],
    });
  } catch (e: unknown) {
    context.logger.fatal("Adding a label to issue failed!", e);
  }
}

export async function addCommentToIssue(
  context: Context,
  message: HandlerReturnValuesNoVoid,
  issueNumber: number,
  owner?: string,
  repo?: string
) {
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
      owner: owner ?? payload.repository.owner.login,
      repo: repo ?? payload.repository.name,
      issue_number: issueNumber,
      body: comment,
    });
  } catch (e: unknown) {
    context.logger.fatal("Adding a comment failed!", e);
  }
}

//  async function upsertLastCommentToIssue(context: Context, issueNumber: number, commentBody: string) {
//   try {
//     const comments = await getAllIssueComments(context, issueNumber);

//     if (comments.length > 0 && comments[comments.length - 1].body !== commentBody)
//       await addCommentToIssue(context, commentBody, issueNumber);
//   } catch (e: unknown) {
//     context.logger.fatal("Upserting last comment failed!", e);
//   }
// }

//  async function getIssueDescription(
//   context: Context,
//   issueNumber: number,
//   format: "raw" | "html" | "text" = "raw"
// ): Promise<string> {
//   const payload = context.payload;

//   try {
//     const response = await context.octokit.rest.issues.get({
//       owner: payload.repository.owner.login,
//       repo: payload.repository.name,
//       issue_number: issueNumber,
//       mediaType: {
//         format,
//       },
//     });

//     let result = response.data.body;

//     if (format === "html") {
//       result = response.data.body_html;
//     } else if (format === "text") {
//       result = response.data.body_text;
//     }

//     return result as string;
//   } catch (e: unknown) {
//     throw context.logger.fatal("Fetching issue description failed!", e);
//   }
// }

export async function getAllIssueComments(
  context: Context,
  issueNumber: number,
  format: "raw" | "html" | "text" | "full" = "raw"
): Promise<GitHubComment[]> {
  const payload = context.payload;

  try {
    const comments = (await context.octokit.paginate(context.octokit.rest.issues.listComments, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
      per_page: 100,
      mediaType: {
        format,
      },
    })) as GitHubComment[];
    return comments;
  } catch (e: unknown) {
    context.logger.fatal("Fetching all issue comments failed!", e);
    return [];
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
    if (!payload.organization) throw context.logger.fatal(`No organization found in payload!`);
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
    context.logger.fatal("Adding assignees failed!", e);
  }
}

export async function getAllPullRequests(context: Context, state: "open" | "closed" | "all" = "open") {
  const payload = context.payload;

  try {
    const pulls = await context.octokit.paginate(context.octokit.rest.pulls.list, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state,
      per_page: 100,
    });
    return pulls;
  } catch (err: unknown) {
    context.logger.fatal("Fetching all pull requests failed!", err);
    return [];
  }
}

//  async function getReviewRequests(context: Context, pullNumber: number, owner: string, repo: string) {
//   try {
//     const response = await context.octokit.pulls.listRequestedReviewers({
//       owner: owner,
//       repo: repo,
//       pull_number: pullNumber,
//     });
//     return response.data;
//   } catch (err: unknown) {
//     context.logger.fatal("Could not get requested reviewers", err);
//     return null;
//   }
// }

// Get issues assigned to a username

// async function getOpenedPullRequestsForAnIssue(context: Context, issueNumber: number, userName: string) {
//   const pulls = await getOpenedPullRequests(context, userName);

//   return pulls.filter((pull) => {
//     if (!pull.body) return false;
//     const issues = pull.body.match(/#(\d+)/gi);

//     if (!issues) return false;

//     const linkedIssueNumbers = Array.from(new Set(issues.map((issue) => issue.replace("#", ""))));
//     if (linkedIssueNumbers.indexOf(`${issueNumber}`) !== -1) return true;
//     return false;
//   });
// }
