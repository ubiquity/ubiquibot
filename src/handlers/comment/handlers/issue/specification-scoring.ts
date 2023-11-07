import Decimal from "decimal.js";

import { Context } from "../../../../types";
import { Comment, Issue } from "../../../../types/payload";
import { allCommentScoring } from "./allCommentScoring";
import { ContributorClass } from "./contribution-style-types";
import { UserScoreDetails } from "./issue-shared-types";
import { relevanceAndFormatScoring } from "./relevance-format-scoring";

// import { IssueRole } from "./archive/calculate-score-typings";
export type ContributorClassNames = keyof ContributorClass;

export type ContextIssue = { context: Context; issue: Issue };

export async function specificationScoring({ context, issue }: ContextIssue): Promise<UserScoreDetails[]> {
  const userScoreDetails = [] as UserScoreDetails[];

  const issueAsComment = {
    body: issue.body,
    user: issue.user,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    id: issue.id,
    node_id: issue.node_id,
    author_association: issue.author_association,
    html_url: issue.html_url,
    url: issue.url,
  } as Comment;

  const RELEVANT = [
    {
      commentId: issue.id,
      userId: issue.user.id,
      score: new Decimal(1),
    },
  ];

  const formatting = await allCommentScoring({ context, issue, proof: [issueAsComment] });
  const scoreDetails = relevanceAndFormatScoring({ relevanceScore: RELEVANT, formatScore: formatting, issue });

  for (const user in scoreDetails) {
    const userScore = scoreDetails[user];
    userScoreDetails.push(userScore);
  }

  return userScoreDetails;
}
