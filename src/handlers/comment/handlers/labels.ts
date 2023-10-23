import Runtime from "../../../bindings/bot-runtime";
import { isUserAdminOrBillingManager } from "../../../helpers";
import { Context, Payload } from "../../../types";

export async function setLabels(context: Context, body: string) {
  const runtime = Runtime.getState();
  const logger = runtime.logger;
  const payload = context.event.payload as Payload;
  const sender = payload.sender.login;

  const sufficientPrivileges = await isUserAdminOrBillingManager(context, sender);
  if (!sufficientPrivileges)
    return logger.info(`You are not an admin and do not have the required permissions to access this function.`); // if sender is not admin, return

  if (!payload.issue) return logger.info(`Skipping '/labels' because of no issue instance`);

  if (body.startsWith("/labels")) {
    const { username, labels } = parseComment(body);
    const { access, user } = Runtime.getState().adapters.supabase;
    const url = payload.comment?.html_url as string;
    if (!url) throw new Error("Comment url is undefined");

    const nodeInfo = {
      node_id: payload.comment?.node_id,
      node_type: "IssueComment" as const,
      node_url: url,
    };

    const userId = await user.getUserId(username);
    await access.setAccess(labels, nodeInfo, userId);
    if (!labels.length) {
      return logger.ok("Successfully cleared access", { username });
    }
    return logger.ok("Successfully set access", { username, labels });
  } else {
    throw logger.error(
      `Invalid syntax for allow \n usage: '/labels set-(access type) @user true|false' \n  ex-1 /labels set-multiplier @user false`
    );
  }
}

function parseComment(comment: string): { username: string; labels: string[] } {
  // Extract the @username using a regular expression
  const usernameMatch = comment.match(/@(\w+)/);
  if (!usernameMatch) throw new Error("Username not found in comment");
  const username = usernameMatch[1];

  // Split the comment into words and filter out the command and the username
  const labels = comment.split(/\s+/).filter((word) => word !== "/labels" && !word.startsWith("@"));
  // if (!labels.length) throw new Error("No labels found in comment");

  // no labels means clear access

  return {
    username: username,
    labels: labels,
  };
}
