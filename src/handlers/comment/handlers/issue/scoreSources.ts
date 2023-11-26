import { Context } from "../../../../types/context";
import { Comment, Issue, User } from "../../../../types/payload";
import { assigneeScoring as assigneeTaskScoring } from "./assignee-scoring";
import { commentsScoring } from "./evaluate-comments";
import { getPullRequestComments } from "./get-pull-request-comments";
import { UserScoreDetails } from "./issue-shared-types";
import { specificationScoring as issuerSpecificationScoring } from "./specification-scoring";

export async function aggregateAndScoreContributions({
  context,
  issue,
  issueComments,
  owner,
  repository,
  issueNumber,
}: ScoreParams): Promise<UserScoreDetails[]> {
  const issueIssuerSpecification = await issuerSpecificationScoring({ context, issue, view: "Issue" });

  const issueAssigneeTask = await assigneeTaskScoring(context, {
    issue,
    source: issue.assignees.filter((assignee): assignee is User => Boolean(assignee)),
    view: "Issue",
  });

  const issueContributorComments = await commentsScoring({
    context,
    issue,
    source: issueComments.filter(botCommandsAndHumanCommentsFilter),
    view: "Issue",
  });

  const reviewContributorComments = await commentsScoring({
    context,
    issue,
    source: (
      await getPullRequestComments(context, owner, repository, issueNumber)
    ).filter(botCommandsAndHumanCommentsFilter),
    view: "Review",
  });

  // TODO: review pull request scoring
  // TODO: code contribution scoring

  return [...issueIssuerSpecification, ...issueAssigneeTask, ...issueContributorComments, ...reviewContributorComments];
}

interface ScoreParams {
  context: Context;
  issue: Issue;
  issueComments: Comment[];
  owner: string;
  repository: string;
  issueNumber: number;
}

// different ways to earn:

/**
 *
 * 1. write a specification
 * - things to collect:
 * -  - author (User)
 * -  - issue (Issue)
 * - scoring:
 * -  - formatting
 * -  - word count
 * -  - clarity
 *
 * 2. be assigned a task and complete it
 * - things to collect:
 * -  - assignees (User[])
 * -  - issue (Issue)
 * - scoring:
 * -  - just take the price of the issue, divide by amount of assignees
 *
 * 3. comment on the issue
 * - things to collect:
 * -  - author (User)
 * -  - issue (Issue)
 * -  - comments (Comment[])
 * - scoring:
 * -  - formatting
 * -  - word count
 * -  - relevance
 *
 * 4. comment on the pull request
 * - things to collect:
 * -  - author (User)
 * -  - issue (Issue)
 * -  - comments (Comment[])
 * - scoring:
 * -  - formatting
 * -  - word count
 * -  - relevance
 *
 * 5. review the pull request
 * - things to collect:
 * -  - reviewer (User)
 * -  - issue (Issue)
 * -  - comments (Comment[])
 * -  - pull request (PullRequest)
 * -  - review (Review)
 * -  - review comments (Comment[])
 * - scoring:
 * -  - formatting
 * -  - word count
 * -  - relevance
 *
 * 6. contribute code
 * - things to collect:
 * -  - author (User)
 * -  - issue (Issue)
 * -  - pull request (PullRequest)
 * -  - commits (Commit[])
 * -  - files (File[])
 * - scoring:
 * -  - ???
 *
 */

function botCommandsAndHumanCommentsFilter(comment: Comment) {
  return !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User";
} /* No Bots */
