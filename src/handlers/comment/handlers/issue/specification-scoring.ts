import Runtime from "../../../../bindings/bot-runtime";
import { Context } from "../../../../types";
import { Comment, Issue, User } from "../../../../types/payload";
// import { IssueRole } from "./archive/calculate-score-typings";
import Decimal from "decimal.js";
import { commentScoringByContributionStyle } from "./comment-scoring-by-contribution-style";
import { CommentScoringRubric } from "./comment-scoring-rubric";
import { ContributionStyleTypes } from "./contribution-style-types";
import { FinalScores } from "./evaluate-comments";
import { formatScoring } from "./format-scoring";
import { identifyUserIds } from "./identify-user-ids";
import { relevanceAndFormatScoring } from "./relevance-format-scoring";
import { filterCommentsByContributionType } from "./filter-comments-by-contribution-type";

export type ContributionStyles = keyof ContributionStyleTypes;

type ContextIssue = { context: Context; issue: Issue };

export async function specificationScoring({
  context,
  issue,
}: ContextIssue): Promise<{ source: Comment[]; score: FinalScores }> {
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
  const score = relevanceAndFormatScoring(RELEVANT, formatting);
  return { score, source: [issueAsComment] };
}

export async function allCommentScoring({ context, issue, proof }: ContextIssue & { proof: Comment[] }) {
  const runtime = Runtime.getState();

  const usersOfCommentsByRole: ContributionStyleTypes = await identifyUserIds(context, issue, proof);
  const commentsByRole = filterCommentsByContributionType(usersOfCommentsByRole, proof);
  const contributionStyles = Object.keys(usersOfCommentsByRole) as ContributionStyles[];

  const scoringRubrics = [] as CommentScoringRubric[];

  for (const contributionStyle of contributionStyles) {
    const scoring = commentScoringByContributionStyle[contributionStyle];
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

function perUserCommentScoring(user: User, comments: Comment[], scoringRubric: CommentScoringRubric) {
  for (const comment of comments) {
    scoringRubric.computeWordScore(comment, user.id);
    scoringRubric.computeElementScore(comment, user.id);
  }
  scoringRubric.compileUserScores();
  return scoringRubric;
}
