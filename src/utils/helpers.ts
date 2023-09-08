import { Level } from "../adapters/supabase";

export const getNumericLevel = (level: Level) => {
  switch (level) {
    case Level.ERROR:
      return 0;
    case Level.WARN:
      return 1;
    case Level.INFO:
      return 2;
    case Level.HTTP:
      return 3;
    case Level.VERBOSE:
      return 4;
    case Level.DEBUG:
      return 5;
    case Level.SILLY:
      return 6;
    default:
      return -1; // Invalid level
  }
};

export const ErrorDiff = (message: unknown) => {
  return `<code> ` + "```diff \n" + `- ${message}` + "```" + ` </code>`;
};
