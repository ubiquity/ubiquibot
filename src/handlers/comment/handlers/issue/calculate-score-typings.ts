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

//

type ContributionLocation = "issue" | "review";
type ContributionStyle = "issuer" | "assignee" | "collaborator" | "default";
export type Role =
  | "Issue Issuer"
  | "Issue Assignee"
  | "Issue Collaborator"
  | "Issue Default"
  | "Review Issuer"
  | "Review Assignee"
  | "Review Collaborator"
  | "Review Default";

type ReviewState = "commented" | "approved" | "requestChanges" | "dismissed";

export type CommentScoringConfig = {
  wordCredit: number; // credit per word
  listItemCredit: number; // credit per list item
  imageCredit: number; // credit per image
  linkCredit: number; // credit per link
  codeBlockCredit: number; // credit per code block
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
export type CommentScoringRubric = {
  [key in Role]: CommentScoringConfig;
};
