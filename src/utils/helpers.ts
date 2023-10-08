export function ErrorDiff(message: string | Error) {
  if (message instanceof Error) {
    console.trace(message);
    return "```diff\n! " + message.message + "\n- " + message.stack + "\n```";
  } else {
    console.trace("Received non-Error object:", message);
    return "```diff\n! " + String(message) + "\n```";
  }
}
