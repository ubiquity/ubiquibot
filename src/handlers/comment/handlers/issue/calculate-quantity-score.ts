import { CommentScoringConfig } from "./calculate-score-typings";

export function calculateQuantScore(issue: Issue, contributorComments: Comment[]): number {
  let score = 0;

  // Count words
  const words = comment.split(/\s+/);
  score += words.length * config.wordCredit;

  // Count list items
  const listItems = (comment.match(/^\s*[-+*]\s+/gm) || []).length;
  score += listItems * config.listItemCredit;

  // Count images
  const images = (comment.match(/!\[.*?\]\(.*?\)/g) || []).length;
  score += images * config.imageCredit;

  // Count links
  const links = (comment.match(/\[.*?\]\(.*?\)/g) || []).length;
  score += links * config.linkCredit;

  // Count code blocks
  const codeBlocks = (comment.match(/```[\s\S]*?```/g) || []).length;
  score += codeBlocks * config.codeBlockCredit;

  return score;
}

function calculateIssueIssuerQuantScore(comment: string, rubric: ScoringRubric) {}
function calculateIssueAssigneeQuantScore(comment: string, rubric: ScoringRubric) {}
function calculateIssueCollaboratorQuantScore(comment: string, rubric: ScoringRubric) {}
function calculateIssueDefaultQuantScore(comment: string, rubric: ScoringRubric) {}
// function calculateReviewIssuerQuantScore(){}
// function calculateReviewAssigneeQuantScore(){}
// function calculateReviewCollaboratorQuantScore(){}
// function calculateReviewDefaultQuantScore(){}
