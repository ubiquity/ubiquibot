import { Logger } from "../../bindings";
import { User, UserType } from "../../types";
import { commentParser } from "../comment";
import { Comment } from "../../types";

export function walkComments({
  issueComments,
  assignee,
  logger,
  issueCommentsByUser,
}: {
  issueComments: Comment[];
  assignee: User;
  logger: Logger;
  issueCommentsByUser: Record<string, { id: string; comments: string[] }>;
}) {
  for (const issueComment of issueComments) {
    const user = issueComment.user;
    if (user.type == UserType.Bot || user.login == assignee.login) continue;
    const commands = commentParser(issueComment.body);
    if (commands.length > 0) {
      logger.info(`Skipping to parse the comment because it contains commands. comment: ${JSON.stringify(issueComment)}`);
      continue;
    }
    if (!issueComment.body_html) {
      logger.info(`Skipping to parse the comment because body_html is undefined. comment: ${JSON.stringify(issueComment)}`);
      continue;
    }

    // Store the comment along with user's login and node_id
    if (!issueCommentsByUser[user.login]) {
      issueCommentsByUser[user.login] = { id: user.node_id, comments: [] };
    }
    issueCommentsByUser[user.login].comments.push(issueComment.body_html);
  }
}
