import { Context } from "../../../types/context";

export async function checkIfFollowUpAlreadyPosted(
  context: Context,
  login: string,
  name: string,
  number: number,
  followUpMessage: string,
  disqualificationPeriod: number
) {
  const comments = await context.event.octokit.rest.issues.listComments({
    owner: login,
    repo: name,
    issue_number: number,
  });

  // Get the current time
  const now = new Date().getTime();

  // Check if a similar comment has already been posted within the disqualification period
  let hasRecentFollowUp = false;
  for (const comment of comments.data) {
    context.logger.debug("Checking comment for follow-up", { comment });
    if (
      comment &&
      comment.body === followUpMessage &&
      comment.user?.type === "Bot" &&
      now - new Date(comment?.created_at).getTime() <= disqualificationPeriod
    ) {
      hasRecentFollowUp = true;
      break;
    }
  }
  return hasRecentFollowUp;
}
