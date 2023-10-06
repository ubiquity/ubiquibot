import { getAdapters, getBotContext, getLogger } from "../../../bindings";
import { isUserAdminOrBillingManager } from "../../../helpers";
import { Payload } from "../../../types";

export async function setAccess(body: string): Promise<string> {
  const context = getBotContext();
  const logger = getLogger();
  const payload = context.payload as Payload;
  const sender = payload.sender.login;

  const userCan = await isUserAdminOrBillingManager(sender, context);
  if (userCan)
    return logger.info(`You are not an admin and do not have the required permissions to access this function.`); // if sender is not admin, return

  // const validAccessString = ["priority", "time", "price", "multiplier"];
  if (!payload.issue) return logger.info(`Skipping '/allow' because of no issue instance`);

  if (body.startsWith("/allow")) {
    logger.info(`Received '/allow' command from user: ${sender}`);

    // const bodyArray = body.split(" ");
    const { username, labels } = parseComment(body);
    // const gitHubUserName = body.split("@")[1].split(" ")[0];
    const { access, user } = getAdapters().supabase;
    const url = payload.comment?.html_url as string;
    if (!url) throw new Error("Comment url is undefined");

    const nodeInfo = {
      id: payload.comment?.node_id,
      type: "IssueComment" as const,
      url,
    };

    const userId = await user.getUserId(username);
    await access.setAccess(labels, nodeInfo, userId);
    return logger.info(`Successfully set access for ${username} to ${labels.join(", ")}`);
  } else {
    return logger.error(
      `Invalid syntax for allow \n usage: '/allow set-(access type) @user true|false' \n  ex-1 /allow set-multiplier @user false`
    );
  }
}

function parseComment(comment: string): { username: string; labels: string[] } {
  // Extract the @username using a regular expression
  const usernameMatch = comment.match(/@(\w+)/);
  if (!usernameMatch) throw new Error("Username not found in comment");
  const username = usernameMatch[1];

  // Split the comment into words and filter out the command and the username
  const labels = comment.split(/\s+/).filter((word) => word !== "/allow" && !word.startsWith("@"));
  if (!labels.length) throw new Error("No labels found in comment");

  return {
    username: username,
    labels: labels,
  };
}

// // Example usage:
// const comment = "/allow @user time price priority";
// const parsed = parseComment(comment);
// console.log(parsed);
