export function ErrorDiff(message: string, stack?: string) {
  console.trace(message);
  let buffer;
  if (stack) {
    buffer = "```diff\n! " + message + "\n" + stack + "\n```";
  } else {
    buffer = "```diff\n! " + message + "\n```";
  }
  return buffer;
}
