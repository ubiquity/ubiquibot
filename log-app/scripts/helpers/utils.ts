export enum Level {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly",
}

export const createGitHubCommentURL = (orgName: string, repoName: string, issueNumber: number, commentId: number) => {
  return `https://github.com/${orgName}/${repoName}/issues/${issueNumber}#issuecomment-${commentId}`;
};

export const isValidJson = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
};

export const generateRandomId = (length) => {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join("");
};

export const containsValidJson = (message: string): [boolean, string, string] => {
  const jsonMatches = message.match(/\{.*\}/g); // Find JSON-like substrings
  if (!jsonMatches) {
    return [false, "", ""];
  }

  for (const match of jsonMatches) {
    if (isValidJson(match)) {
      const braceIndex = message.indexOf("{");
      if (braceIndex !== -1) {
        return [true, match, message.substring(0, braceIndex)];
      }
      return [true, match, ""];
    }
  }

  return [false, "", ""];
};

export const getLevelString = (level: number) => {
  switch (level) {
    case 0:
      return Level.ERROR;
    case 1:
      return Level.WARN;
    case 2:
      return Level.INFO;
    case 3:
      return Level.HTTP;
    case 4:
      return Level.VERBOSE;
    case 5:
      return Level.DEBUG;
    case 6:
      return Level.SILLY;
    default:
      return -1; // Invalid level
  }
};
