export const GLOBAL_STRINGS = {
  unassignComment: "Releasing the bounty back to dev pool because the allocated duration already ended!",
  askUpdate: "Do you have any updates",
  assignCommandDisabledComment: "The `/assign` command is disabled for this repository.",
  skipPriceLabelGenerationComment: "Pricing is disabled on parent issues.",
  ignoreStartCommandForParentIssueComment:
    "Please select a child issue from the specification checklist to work on. The `/start` command is disabled on parent issues.",
  autopayComment: "Automatic payment for this issue is enabled:",
};

// Typescript equivalent of Python's f-string

type Variables = Record<string, string | number>;

export const formatFString = <T extends Variables>(template: string, variables: T): string => {
  return template.replace(/{(.*?)}/g, (_match, key) => {
    if (!(key.trim() in variables)) throw new Error(`Missing value for variable: ${key.trim()}`);
    return String(variables[key.trim()]);
  });
};
