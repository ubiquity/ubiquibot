import { Context } from "../../../../types/context";
import { Comment, Issue, User } from "../../../../types/payload";
import { assigneeScoring as assigneeTaskScoring } from "./assignee-scoring";
import { commentsScoring } from "./evaluate-comments";
import { getPullRequestComments } from "./getPullRequestComments";
import { botCommandsAndHumanCommentsFilter } from "./issue-closed";
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
  // different ways to earn:
  // 1. write a specification
  // 2. be assigned a task and complete it
  // 3. comment on the issue
  // 4. comment on the pull request
  // 5. review the pull request
  // 6. contribute code

  const issueIssuerSpecification = await issuerSpecificationScoring({ context, issue });

  const issueAssigneeTask = await assigneeTaskScoring({
    issue,
    source: issue.assignees.filter((assignee): assignee is User => Boolean(assignee)),
  });

  const issueContributorComments = await commentsScoring({
    context,
    issue,
    source: issueComments.filter(botCommandsAndHumanCommentsFilter),
  });

  const reviewContributorComments = await commentsScoring({
    context,
    issue,
    source: (
      await getPullRequestComments(context, owner, repository, issueNumber)
    ).filter(botCommandsAndHumanCommentsFilter),
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
