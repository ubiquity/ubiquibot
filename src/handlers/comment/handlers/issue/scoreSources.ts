import { Issue, User } from "../../../../types/payload";
import { assigneeScoring as assigneeTaskScoring } from "./assignee-scoring";
import { evaluateComments } from "./evaluate-comments";
import { specificationScoring as issuerSpecificationScoring } from "./specification-scoring";
import { botCommandsAndHumanCommentsFilter } from "./issue-closed";
import { getPullRequestComments } from "./getPullRequestComments";
import { ScoresByUser } from "./issue-shared-types";
import { Context } from "../../../../types/context";
import { Comment } from "../../../../types/payload";

export interface ScoringAndSourcesByContributionClass {
  issueIssuerSpecification: ScoresByUser; // only one person can write the specification
  issueAssigneeTask: ScoresByUser[]; // can be multiple assignees
  issueContributorComments: ScoresByUser[];
  reviewContributorComments: ScoresByUser[];
}

export async function scoreSources({
  context,
  issue,
  issueComments,
  owner,
  repository,
  issueNumber,
}: ScoreParams): Promise<ScoringAndSourcesByContributionClass> {
  return {
    issueIssuerSpecification: await issuerSpecificationScoring({ context, issue }),

    issueAssigneeTask: await assigneeTaskScoring({
      issue,
      source: issue.assignees.filter((assignee): assignee is User => Boolean(assignee)),
    }),

    issueContributorComments: await evaluateComments({
      context,
      issue,
      source: issueComments.filter(botCommandsAndHumanCommentsFilter),
    }),

    reviewContributorComments: await evaluateComments({
      context,
      issue,
      source: (
        await getPullRequestComments(context, owner, repository, issueNumber)
      ).filter(botCommandsAndHumanCommentsFilter),
    }),
  };
}

interface ScoreParams {
  context: Context;
  issue: Issue;
  issueComments: Comment[];
  owner: string;
  repository: string;
  issueNumber: number;
}
