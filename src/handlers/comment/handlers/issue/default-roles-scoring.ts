const incentives = {
  formatMultiplier: null,
  wordValue: null,
};

type RoleAction = {
  [key: string]: {
    [key: string]: {
      name?: string;
      specification?: typeof incentives;
      comment?: typeof incentives;
      //   approval?: typeof incentives;
      //   rejection?: typeof incentives;
      //   code?: typeof incentives;
    };
  };
};

const roles: RoleAction = {
  issuer: {
    issue: {
      comment: incentives,
      specification: incentives,
    },
    review: {
      comment: incentives,
      //   approval: incentives,
      //   rejection: incentives,
      //   code: incentives,
    },
  },
  assignee: {
    issue: {
      comment: incentives,
    },
    review: {
      comment: incentives,
      //   code: incentives,
    },
  },
  collaborator: {
    issue: {
      comment: incentives,
    },
    review: {
      comment: incentives,
      //   approval: incentives,
      //   rejection: incentives,
      //   code: incentives,
    },
  },
  default: {
    issue: {
      comment: incentives,
    },
    review: {
      comment: incentives,
    },
  },
};

function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function populateNameProperty(roles: RoleAction): void {
  for (const [role, values] of Object.entries(roles)) {
    for (const [view, incentives] of Object.entries(values)) {
      for (const [incentiveType] of Object.entries(incentives)) {
        const titleCaseName = toTitleCase(`${view} ${role} ${incentiveType}`);
        incentives.name = titleCaseName;
      }
    }
  }
}

populateNameProperty(roles);
export { roles };
