import Runtime from "../../../../bindings/bot-runtime";
// import { User } from "../../../../types";

// type ContributionLocation = "issue" | "review";
// type ContributionStyle = "issuer" | "assignee" | "collaborator" | "default";
// type Role =
//   | "issueIssuer"
//   | "issueAssignee"
//   | "issueCollaborator"
//   | "issueDefault"
//   | "reviewIssuer"
//   | "reviewAssignee"
//   | "reviewCollaborator"
//   | "reviewDefault";

// type DevPoolContributor = {
//   contribution: {
//     role: Role;
//     style: ContributionStyle;
//   };
//   records: {
//     comments: [
//       {
//         location: ContributionLocation;
//         issueId: number;
//         commentId: number;
//         body: string;
//         score: {
//           quantitative: number;
//           qualitative: string;
//         };
//       }
//     ];
//     review: [];
//   };
//   user: User;
//   walletAddress: string;
// };

// type Payments = {
//   contributors: User[];
// };

import { getAllIssueComments } from "../../../../helpers";
import { User } from "../../../../types";
import { calculateQualScore } from "./calculate-quality-score";
import { Payload, Issue } from "../../../../types/payload";

type ContributionLocation = "issue" | "review";
type ContributionStyle = "issuer" | "assignee" | "collaborator" | "default";
type Role =
  | "issueIssuer"
  | "issueAssignee"
  | "issueCollaborator"
  | "issueDefault"
  | "reviewIssuer"
  | "reviewAssignee"
  | "reviewCollaborator"
  | "reviewDefault";

type ReviewState = "commented" | "approved" | "requestChanges" | "dismissed";

type CommentScoringConfig = {
  // wordCredit: number; // credit per word
  // listItemCredit: number; // credit per list item
  // imageCredit: number; // credit per image
  // linkCredit: number; // credit per link
  // codeBlockCredit: number; // credit per code block
};

export type CommentScore = {
  qualitative: number; // a float between 0 and 1
  quantitative: number; // calculated based on CommentScoringConfig
  finalScore: number; // qualitative * quantitative
};

type LabelAction = {
  label: string;
  added: boolean; // true if added, false if removed
};

type PaymentConfig = {
  // Define how much each role and action is worth in monetary terms
  [key in Role]: {
    comment: number;
    // labelPriority: number;
    // labelTime: number;
    // codeCommit: number;
    // edit: number;
    reviewState: {
      [key in ReviewState]: number;
    };
    // timeSpent: number; // Per unit time
  };
};

type ContributionRecord = {
  comments: {
    location: ContributionLocation;
    issueId: number;
    commentId: number;
    body: string;
    timestamp: string;
    score: CommentScore;
  }[];
  // labels: {
  //   issueId: number;
  //   actions: LabelAction[];
  //   timestamp: string;
  // }[];
  // commits: {
  //   pullRequestId: number;
  //   commitId: string;
  //   timestamp: string;
  // }[];
  // edits: {
  //   location: ContributionLocation;
  //   issueId: number;
  //   editedField: "description" | "comment"; // Add more fields if necessary
  //   timestamp: string;
  // }[];
  reviewStates: {
    pullRequestId: number;
    state: ReviewState;
    timestamp: string;
  }[];
  // timeSpent: number; // In some unit, e.g., minutes
};

type DevPoolContributor = {
  contribution: {
    role: Role;
    style: ContributionStyle;
  };
  records: ContributionRecord;
  user: User;
  walletAddress: string;
};

type Payments = {
  contributors: DevPoolContributor[];
  totalPayment: number;
};

// Your existing logic here

export async function issueClosed() {
  const { issue } = preamble();
  const issueComments = await getAllIssueComments(issue.number);
  calculateQualScore(issue, issueComments);
}

function preamble() {
  const runtime = Runtime.getState();
  const context = runtime.latestEventContext;
  const payload = context.payload as Payload;
  const issue = payload.issue as Issue;
  if (!issue) throw runtime.logger.error("Issue is not defined");
  return { issue, payload, context, runtime };
}
