export enum View {
  ISSUE = "issue", // The issue itself
  REVIEW = "review", // A review of an issue
}

export enum Role {
  ISSUER = "issuer", // Someone who created the issue
  ASSIGNEE = "assignee", // Someone who is assigned to the issue
  COLLABORATOR = "collaborator", // Someone who is not the issuer or assignee, but is a collaborator
  DEFAULT = "default", // Everyone else
}

export enum Contribution {
  COMMENT = "comment", // Wrote a comment
  APPROVAL = "approval", // Approved the review
  REJECTION = "rejection", // Rejected the review
  SPECIFICATION = "specification", // Wrote the issue specification
  CODE = "code", // Wrote code
}

type ContributionTypes = {
  [key in Contribution]?: boolean;
};

type RoleTypes = {
  [key in Role]?: ContributionTypes;
};

type ViewTypes = {
  [key in View]: RoleTypes;
};

export const validCombinations: ViewTypes = {
  [View.ISSUE]: {
    [Role.ISSUER]: {
      [Contribution.COMMENT]: true,
      [Contribution.SPECIFICATION]: true,
    },
    [Role.ASSIGNEE]: {
      [Contribution.COMMENT]: true,
    },
    [Role.COLLABORATOR]: {
      [Contribution.COMMENT]: true,
    },
    [Role.DEFAULT]: {
      [Contribution.COMMENT]: true,
    },
  },
  [View.REVIEW]: {
    [Role.ISSUER]: {
      [Contribution.COMMENT]: true,
      [Contribution.APPROVAL]: true,
      [Contribution.REJECTION]: true,
      [Contribution.CODE]: true,
    },
    [Role.ASSIGNEE]: {
      [Contribution.COMMENT]: true,
      [Contribution.APPROVAL]: true,
      [Contribution.REJECTION]: true,
      [Contribution.CODE]: true,
    },
    [Role.COLLABORATOR]: {
      [Contribution.COMMENT]: true,
      [Contribution.APPROVAL]: true,
      [Contribution.REJECTION]: true,
      [Contribution.CODE]: true,
    },
    [Role.DEFAULT]: {
      [Contribution.COMMENT]: true,
    },
  },
};
