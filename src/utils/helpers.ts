import { formatStackTrace } from "../adapters/supabase/helpers/pretty-logs";

export function ErrorDiff(message: string, stack?: string) {
  console.trace(message);
  let buffer;
  if (stack) {
    buffer = "```diff\n- " + message + "\n" + formatStackTrace(stack) + "\n```";
  } else {
    buffer = "```diff\n- " + message + "\n" + formatStackTrace(new Error().stack as string, 3, "#\t") + "\n```";
  }
  return buffer;
}
