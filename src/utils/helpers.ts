export const ErrorDiff = (error: Error | unknown, message?: string) => {
  if (error instanceof Error) {
    console.trace(error, message);
    return "```diff\n! " + error.message + "\n- " + error.stack + "\n```";
  } else {
    console.trace("Received non-Error object:", error, message);
    return "```diff\n! " + String(error) + "\n```";
  }
};
