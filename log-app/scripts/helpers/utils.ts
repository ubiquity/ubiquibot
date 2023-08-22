export enum Level {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  HTTP = "http",
  VERBOSE = "verbose",
  DEBUG = "debug",
  SILLY = "silly",
}

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
