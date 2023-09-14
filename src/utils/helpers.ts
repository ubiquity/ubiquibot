export const ErrorDiff = (message: unknown) => {
  return "```diff\n! " + message + "\n```";
};
