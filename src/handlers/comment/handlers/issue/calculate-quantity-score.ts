import { checkUserPermissionForRepoAndOrg } from "../../../../helpers";
import { Comment, Issue } from "../../../../types/payload";
import { CommentScoringRubric, Role } from "./calculate-score-typings";
import { getCollaboratorIdsForRepo } from "./get-collaborator-ids-for-repo";
import Runtime from "../../../../bindings/bot-runtime";

export async function calculateQuantScore(issue: Issue, contributorComments: Comment[]) {
  // _calculateSpecificationScore(issue.body, specificationScoringRubric);
  await _calculateCommentScores(issue, contributorComments);
}

const specificationScoringRubric = {
  wordCredit: 0.2,
  listItemCredit: 1,
  imageCredit: 0,
  linkCredit: 10,
  codeBlockCredit: 10,
};

const commentScoringRubric = {
  "Issue Issuer": {
    wordCredit: 0.1,
    listItemCredit: 0.5,
    imageCredit: 0,
    linkCredit: 5,
    codeBlockCredit: 5,
  },
} as CommentScoringRubric;

async function _calculateCommentScores(issue: Issue, contributorComments: Comment[]) {
  const roleIds = await _getRoleIds();
  const roles = Object.keys(roleIds) as Role[];

  const commentsByRole = filterCommentsByRole();

  for (const role of roles) {
    _calculateCommentScore(role, commentsByRole[role], commentScoringRubric[role]);
  }

  // === Helper functions below === //

  function filterCommentsByRole() {
    return {
      "Issue Issuer": contributorComments.filter((comment) => comment.user.id === roleIds["Issue Issuer"]),
      "Issue Assignee": contributorComments.filter((comment) => comment.user.id === roleIds["Issue Assignee"]),
      "Issue Collaborator": contributorComments.filter((comment) =>
        roleIds["Issue Collaborator"].includes(comment.user.id)
      ),
      "Issue Default": contributorComments.filter(
        (comment) =>
          comment.user.type === "User" &&
          !roleIds["Issue Collaborator"].includes(comment.user.id) &&
          comment.user.id !== roleIds["Issue Assignee"] &&
          comment.user.id !== roleIds["Issue Issuer"]
      ),
    } as {
      [key in Role]: Comment[];
    };
  }

  async function _getRoleIds() {
    const context = Runtime.getState().latestEventContext;

    const issueIssuerId = issue.user.id;
    const issueAssigneeId = issue.assignee?.id;
    const collaboratorIds = await getCollaboratorIdsForRepo(context);

    const roleIds = {
      "Issue Issuer": issueIssuerId,
      "Issue Assignee": issueAssigneeId,
      "Issue Collaborator": collaboratorIds,
      "Issue Default": (function getRemainderIds() {
        const allRoleIds = [issueIssuerId, issueAssigneeId, ...collaboratorIds];
        const humanIdsWhoCommented = contributorComments
          .filter((comment) => comment.user.type === "User")
          .map((comment) => comment.user.id);
        const defaultIds = humanIdsWhoCommented.filter((id) => !allRoleIds.includes(id));
        return defaultIds;
      })(),
    };
    return roleIds;
  }
}

// function _calculateSpecificationScore(specification: string, rubric: SpecificationScoringRubric) {
// TODO: implement
// }

function _calculateCommentScore(role: Role, comment: string, rubric: ScoringRubric) {
  let score = 0;

  // Count words
  const words = comment.split(/\s+/);
  score += words.length * commentScoringRubric.wordCredit;

  // Count list items
  const listItems = (comment.match(/^\s*[-+*]\s+/gm) || []).length;
  score += listItems * commentScoringRubric.listItemCredit;

  // Count images
  const images = (comment.match(/!\[.*?\]\(.*?\)/g) || []).length;
  score += images * commentScoringRubric.imageCredit;

  // Count links
  const links = (comment.match(/\[.*?\]\(.*?\)/g) || []).length;
  score += links * commentScoringRubric.linkCredit;

  // Count code blocks
  const codeBlocks = (comment.match(/```[\s\S]*?```/g) || []).length;
  score += codeBlocks * commentScoringRubric.codeBlockCredit;

  return score;
}
