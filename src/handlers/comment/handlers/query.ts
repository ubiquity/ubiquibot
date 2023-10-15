import Runtime from "../../../bindings/bot-runtime";
import { Payload } from "../../../types";
import _ from "lodash";

export async function query(body: string) {
  const runtime = Runtime.getState(),
    context = runtime.eventContext,
    logger = runtime.logger,
    payload = context.payload as Payload,
    sender = payload.sender.login;

  logger.info("Running '/query' command handler", { sender });

  const issue = payload.issue;
  if (!issue) return logger.info(`Skipping '/query' because of no issue instance`);

  const regex = /^\/query\s+@([\w-]+)\s*$/;
  const matches = body.match(regex);
  const username = matches?.[1];

  if (!username) {
    throw logger.error("Invalid body for query command \n usage /query @user");
  }

  const database = runtime.adapters.supabase;
  const usernameResponse = await context.octokit.users.getByUsername({ username });
  const user = usernameResponse.data;
  if (!user) {
    throw logger.error("User not found", { username });
  }
  const accessData = await database.access.getAccess(user.id);
  const walletAddress = await database.wallet.getAddress(user.id);
  const messageBuffer = [] as string[];

  messageBuffer.push(renderMarkdownTableHeader());

  if (!accessData && !walletAddress) {
    return logger.warn("No access or wallet found for user", { username });
  }
  if (accessData) {
    messageBuffer.push(appendToMarkdownTableBody(accessData));
  }
  if (walletAddress) {
    messageBuffer.push(appendToMarkdownTableBody({ wallet: walletAddress }));
  }

  return messageBuffer.join("");

  function appendToMarkdownTableBody(data: Record<string, any>, parentKey = ""): string {
    let table = "";

    for (const key in data) {
      const decamelizedKey = _.startCase(_.toLower(key));
      const value = data[key];
      if (typeof value === "object" && value !== null) {
        table += appendToMarkdownTableBody(value as Record<string, any>, `${parentKey}${decamelizedKey} - `);
      } else {
        table += `| ${parentKey}${decamelizedKey} | ${value} |\n`; // Table row
      }
    }

    return table;
  }
}

function renderMarkdownTableHeader(): string {
  return "| Property | Value |\n| --- | --- |\n"; // Table header
}
