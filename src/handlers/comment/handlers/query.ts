import Runtime from "../../../bindings/bot-runtime";

import _ from "lodash";
import { Context } from "../../../types/context";
import { GitHubPayload } from "../../../types/payload";

export async function query(context: Context, body: string) {
  const runtime = Runtime.getState(),
    logger = context.logger,
    payload = context.event.payload as GitHubPayload,
    sender = payload.sender.login;

  logger.info("Running '/query' command handler", { sender });

  const issue = payload.issue;
  if (!issue) return logger.info(`Skipping '/query' because of no issue instance`);

  const regex = /^\/query\s+@([\w-]+)\s*$/;
  const matches = body.match(regex);
  const username = matches?.[1];

  if (!username) {
    throw logger.fatal("Invalid body for query command \n usage /query @user");
  }

  const database = runtime.adapters.supabase;
  const usernameResponse = await context.event.octokit.users.getByUsername({ username });
  const user = usernameResponse.data;
  if (!user) {
    throw logger.fatal("User not found", { username });
  }
  const accessData = await database.access.getAccess(user.id);
  const walletAddress = await database.wallet.getAddress(user.id);
  const messageBuffer = [] as string[];

  messageBuffer.push(renderMarkdownTableHeader());

  if (!accessData && !walletAddress) {
    return logger.error("No access or wallet found for user", { username });
  }
  if (accessData) {
    messageBuffer.push(appendToMarkdownTableBody(accessData));
  }
  if (walletAddress) {
    messageBuffer.push(appendToMarkdownTableBody({ wallet: walletAddress }));
  }

  return messageBuffer.join("");

  function appendToMarkdownTableBody(data: Record<string, unknown>, parentKey = ""): string {
    const tableStringBuffer = [] as string[];

    for (const key in data) {
      const deCamelKey = _.startCase(_.toLower(key));
      const value = data[key];
      if (typeof value === "object" && value !== null) {
        tableStringBuffer.push(
          appendToMarkdownTableBody(value as Record<string, unknown>, `${parentKey}${deCamelKey} - `)
        );
      } else {
        tableStringBuffer.push(`| ${parentKey}${deCamelKey} | ${value} |\n`); // Table row
      }
    }

    return tableStringBuffer.join("");
  }
}

function renderMarkdownTableHeader(): string {
  return "| Property | Value |\n| --- | --- |\n"; // Table header
}
