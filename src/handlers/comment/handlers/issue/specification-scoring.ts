import Decimal from "decimal.js";

import Runtime from "../../../../bindings/bot-runtime";
import { Context } from "../../../../types";
import { Comment, Issue, User } from "../../../../types/payload";
import { commentScoringByContributionClass } from "./comment-scoring-by-contribution-style";
import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorClasses } from "./contribution-style-types";
import { filterCommentsByContributionStyleType } from "./filter-comments-by-contribution-type";
import { formatScoring } from "./format-scoring";
import { identifyUserIds } from "./identify-user-ids";
import { ScoresByUser } from "./issue-shared-types";
import { relevanceAndFormatScoring } from "./relevance-format-scoring";

// import { IssueRole } from "./archive/calculate-score-typings";
export type ContributorClassNames = keyof ContributorClasses;

type ContextIssue = { context: Context; issue: Issue };

export async function specificationScoring({ context, issue }: ContextIssue): Promise<DetailedSource> {
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

  const formatting = await formatScoring(context, issue, [issueAsComment]);
  const scoreDetails = relevanceAndFormatScoring(RELEVANT, formatting);

  const source: ScoresByUser = {
    class: "Issue Issuer Specification",
    userId: issue.user.id,
    username: issue.user.login,
    score: scoreDetails.finalScore,
    scoring: {
      comment: null,
      specification: scoreDetails,
      task: null,
    },
    source: {
      comment: null,
      issue: issue,
    },
  };
  return source;
}

export async function allCommentScoring({ context, issue, proof }: ContextIssue & { proof: Comment[] }) {
  const runtime = Runtime.getState();

  const usersOfCommentsByRole: ContributorClasses = await identifyUserIds(context, issue, proof);
  const commentsByRole = filterCommentsByContributionStyleType(usersOfCommentsByRole, proof);
  const contributionStyles = Object.keys(usersOfCommentsByRole) as ContributorClassNames[];

  const scoringRubrics = [] as CommentScoring[];

  for (const contributionStyle of contributionStyles) {
    const scoring = commentScoringByContributionClass[contributionStyle];
    const selection = usersOfCommentsByRole[contributionStyle];
    if (!selection) {
      runtime.logger.verbose(`No ${contributionStyle} found`);
      continue;
    }

    if (Array.isArray(selection)) {
      // collaborators or default users (array)
      for (const collaboratorOrDefaultUser of selection) {
        const commentsOfRole = commentsByRole[contributionStyle];
        if (!commentsOfRole) {
          continue;
        }
        const scoringComplete = perUserCommentScoring(collaboratorOrDefaultUser, commentsOfRole, scoring);
        scoringRubrics.push(scoringComplete);
      }
    } else {
      // issuer or assignee (single user)
      const commentsOfRole = commentsByRole[contributionStyle];
      if (!commentsOfRole) {
        continue;
      }
      const scoringComplete = perUserCommentScoring(selection, commentsOfRole, scoring);
      scoringRubrics.push(scoringComplete);
    }
  }
  return scoringRubrics;
}

function perUserCommentScoring(user: User, comments: Comment[], scoringRubric: CommentScoring) {
  for (const comment of comments) {
    scoringRubric.computeWordScore(comment, user.id);
    scoringRubric.computeElementScore(comment, user.id);
  }
  scoringRubric.compileUserScores();
  return scoringRubric;
}
